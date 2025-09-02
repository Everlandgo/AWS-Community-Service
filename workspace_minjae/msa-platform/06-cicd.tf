locals {
  artifact_bucket_name = "artifact-${data.aws_caller_identity.current.account_id}-${var.region}"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "artifacts" {
  bucket = local.artifact_bucket_name
  tags   = { Project = var.project, Env = var.env }
}

resource "aws_codestarconnections_connection" "github" {
  name          = "github-hhottdogg"
  provider_type = "GitHub"
}

variable "github_owner" {
  type    = string
  default = "Everlandgo"
}

variable "github_repo" {
  type    = string
  default = "AWS-Community-Service"
}

variable "github_branch" {
  type    = string
  default = "jinyoung"
}

data "aws_iam_policy_document" "cb_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name               = "${var.project}-${var.env}-cb-role"
  assume_role_policy = data.aws_iam_policy_document.cb_trust.json
}

data "aws_iam_policy_document" "cb_policy" {
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"]
  }
  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
  }
  statement {
    actions   = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:DescribeRepositories", "ecr:BatchGetImage"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cb_inline" {
  role   = aws_iam_role.codebuild.id
  name   = "cb-inline"
  policy = data.aws_iam_policy_document.cb_policy.json
}

resource "aws_codebuild_project" "build" {
  name         = "${var.project}-${var.env}-build"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/standard:7.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.region
    }
    environment_variable {
      name  = "REPO_NAME"
      value = "myapp"
    }
    environment_variable {
      name  = "APP_NAME"
      value = "myapp"
    }
    environment_variable {
      name  = "K8S_NAMESPACE"
      value = "default"
    }
  }

  source {
    type = "CODEPIPELINE"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/codebuild/${var.project}-${var.env}-build"
    }
  }

  tags = { Project = var.project, Env = var.env }
}

data "aws_iam_policy_document" "cp_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codepipeline" {
  name               = "${var.project}-${var.env}-cp-role"
  assume_role_policy = data.aws_iam_policy_document.cp_trust.json
}

data "aws_iam_policy_document" "cp_policy" {
  statement {
    actions   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]
  }
  statement {
    actions   = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"]
    resources = [aws_codebuild_project.build.arn]
  }
  statement {
    actions   = ["codestar-connections:UseConnection"]
    resources = [aws_codestarconnections_connection.github.arn]
  }
  statement {
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }
}

resource "aws_iam_role_policy" "cp_inline" {
  role   = aws_iam_role.codepipeline.id
  name   = "cp-inline"
  policy = data.aws_iam_policy_document.cp_policy.json
}

resource "aws_codepipeline" "this" {
  name     = "${var.project}-${var.env}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.artifacts.bucket
  }

  stage {
    name = "Source"
    action {
      name             = "GithubSource"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "DockerBuild"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "EksDeploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "EKS"
      version         = "1"
      input_artifacts = ["build_output"]
      configuration = {
        ClusterName = module.eks.cluster_name
        FilePaths   = "rendered/deployment.yaml"
        Namespace   = "default"
      }
    }
  }

  tags = { Project = var.project, Env = var.env }
}

# EKS access for CodePipeline role
resource "aws_eks_access_entry" "cp" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.codepipeline.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "cp_admin" {
  cluster_name  = module.eks.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.codepipeline.arn
  access_scope {
    type = "cluster"
  }
}

output "pipeline_name" {
  value = aws_codepipeline.this.name
}

output "codestar_connection_arn" {
  value = aws_codestarconnections_connection.github.arn
}


# =============================================================================
# 3단계: IAM 정책 및 역할
# =============================================================================

# EKS 최소 접근 권한 정책
resource "aws_iam_policy" "eks_minimal_access" {
  name        = "${var.project}-eks-minimal-access"
  description = "Minimal EKS access policy for deployment user"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi",
          "eks:DescribeClusterAuthConfig",
          "eks:GetClusterAuthToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeRegions",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# EKS 읽기 전용 정책
resource "aws_iam_policy" "eks_readonly" {
  name        = "${var.project}-eks-readonly"
  description = "EKS read-only access policy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:DescribeNodegroup",
          "eks:ListNodegroups",
          "eks:DescribeFargateProfile",
          "eks:ListFargateProfiles",
          "eks:DescribeAddon",
          "eks:ListAddons",
          "eks:DescribeIdentityProviderConfig",
          "eks:ListIdentityProviderConfigs",
          "eks:DescribeUpdate",
          "eks:ListUpdates",
          "eks:DescribeClusterAuthConfig",
          "eks:GetClusterAuthToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeRegions",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs",
          "ec2:DescribeVolumes",
          "ec2:DescribeLoadBalancers",
          "ec2:DescribeTargetGroups",
          "ec2:DescribeTargetHealth"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeRules"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 출력값
output "eks_minimal_policy_arn" {
  value       = aws_iam_policy.eks_minimal_access.arn
  description = "ARN of the EKS minimal access policy"
}

output "eks_readonly_policy_arn" {
  value       = aws_iam_policy.eks_readonly.arn
  description = "ARN of the EKS read-only policy"
}

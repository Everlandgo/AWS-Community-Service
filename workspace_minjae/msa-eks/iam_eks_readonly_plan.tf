# deploy-s3-frontend 사용자에게 EKS/EC2 조회(Describe) 최소 권한을 부여하는 계획 파일
# - 실제 attach 시에는 계정의 권한 정책에 따라 실패할 수 있으므로,
#   권한이 충분한 주체로 실행하거나 콘솔에서 수동 부착을 권장합니다.

# 읽기 전용 정책 문서 정의
locals {
  eks_readonly_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:Describe*",
          "eks:List*",
          "eks:AccessKubernetesApi",
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
}

# 정책 리소스 생성
resource "aws_iam_policy" "eks_readonly" {
  name        = "${var.project}-eks-readonly"
  description = "Read-only access to EKS and related EC2 describe permissions"
  policy      = local.eks_readonly_policy

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 정책과 사용자 연결 (데이터 소스 없이 직접 사용자명 지정)
resource "aws_iam_user_policy_attachment" "deploy_attach_eks_readonly" {
  user       = "deploy-s3-frontend"
  policy_arn = aws_iam_policy.eks_readonly.arn
}

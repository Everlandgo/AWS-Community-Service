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

# 정책 ARN 출력 (수동으로 사용자에게 연결하기 위함)
output "eks_minimal_policy_arn" {
  value       = aws_iam_policy.eks_minimal_access.arn
  description = "ARN of the EKS minimal access policy"
}

output "eks_minimal_policy_name" {
  value       = aws_iam_policy.eks_minimal_access.name
  description = "Name of the EKS minimal access policy"
}
# =============================================================================
# 2단계: EKS 클러스터 및 노드 그룹
# =============================================================================

# EKS 클러스터 모듈
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.17"

  cluster_name    = "${var.project}-eks"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access       = true
  cluster_endpoint_private_access      = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]

  enable_irsa                              = true
  enable_cluster_creator_admin_permissions = true

  # 노드 그룹 구성
  eks_managed_node_groups = {
    # 1) base_od: AL2023 ARM64, t4g.medium, ON_DEMAND, min=2/desired=2/max=4
    base_od = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = ["t4g.medium"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      desired_size = 2
      max_size     = 4

      labels = {
        role = "app"
      }
    }

    # 2) burst_spot: AL2023 ARM64, c7g.large/m7g.large, SPOT, min=0/desired=0/max=10
    burst_spot = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = ["c7g.large", "m7g.large"]
      capacity_type  = "SPOT"

      min_size     = 0
      desired_size = 0
      max_size     = 10

      labels = {
        role = "burst"
      }

      taints = [{
        key    = "spotOnly"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }

    # 3) fallback_x86_spot: AL2023 X86_64, t3a.medium/m6a.large, SPOT
    fallback_x86_spot = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3a.medium", "m6a.large"]
      capacity_type  = "SPOT"

      min_size     = 0
      desired_size = 0
      max_size     = 4

      labels = {
        role = "fallback"
      }

      taints = [{
        key    = "amd64Only"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 출력값
output "cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name"
}

output "cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
}

output "oidc_provider_arn" {
  value       = module.eks.oidc_provider_arn
  description = "OIDC provider ARN"
}

output "cluster_certificate_authority_data" {
  value       = module.eks.cluster_certificate_authority_data
  description = "Cluster certificate authority data"
}

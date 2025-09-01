module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.17"

  cluster_name    = "${var.project}-eks"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"] # 운영 시 /32 로 축소

  enable_irsa = true

  eks_managed_node_groups = {
    base_od = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = ["t4g.medium"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      desired_size   = 2
      max_size       = 4
      labels = { role = "app" }
    }
    spot_arm = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = ["c7g.large", "m7g.large"]
      capacity_type  = "SPOT"
      min_size       = 0
      desired_size   = 0
      max_size       = 6
      labels = { role = "burst" }
      taints = [{ key = "spotOnly", value = "true", effect = "NO_SCHEDULE" }]
    }
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}

output "cluster_name" { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
output "oidc_provider_arn" { value = module.eks.oidc_provider_arn }



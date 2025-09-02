module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.37"

  cluster_name    = "${var.project}-eks-${var.env}"
  cluster_version = "1.30"

  vpc_id     = aws_vpc.this.id
  subnet_ids = [aws_subnet.private.id]

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  enable_irsa = true

  eks_managed_node_groups = {
    single_az = {
      instance_types = ["t3.medium"]
      min_size       = 1
      desired_size   = 1
      max_size       = 2
      subnet_ids     = [aws_subnet.private.id]
      tags = { role = "app" }
    }
  }

  tags = { Project = var.project, Env = var.env }
}

output "cluster_name" { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }

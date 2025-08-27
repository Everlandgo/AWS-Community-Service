module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.17"

  cluster_name    = "${var.project}-eks"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  public_access_cidrs             = ["0.0.0.0/0"]

  enable_irsa = true

  eks_managed_node_groups = {
    base-od = {
      instance_types = ["m7g.large"]
      capacity_type  = "ON_DEMAND"
      min_size = 2; desired_size = 2; max_size = 4
      labels = { role = "app" }
    }
    burst-spot = {
      instance_types = ["m7g.large","c7g.large"]
      capacity_type  = "SPOT"
      min_size = 0; desired_size = 0; max_size = 10
      labels = { role = "burst" }
    }
  }

  tags = { Project = var.project, Env = var.env }
}

data "aws_eks_cluster" "this" { name = module.eks.cluster_name }
data "aws_eks_cluster_auth" "this" { name = module.eks.cluster_name }

provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.17"

  cluster_name    = "${var.project}-eks"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access_cidrs = ["106.248.40.226"]

  enable_irsa = true

  # 노드 그룹 구성 - 요청 사양 반영
  eks_managed_node_groups = {
    # 1) base_od: AL2023 ARM64, t4g.medium, ON_DEMAND, min=2/desired=2/max=4
    base_od = {
      ami_type       = "AL2023_ARM_64_STANDARD"
      instance_types = ["t4g.medium"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      desired_size = 2
      max_size     = 4

      # 예시 그대로 라벨/태그 유지 (워크로드 역할 구분)
      labels = {
        role = "app"
      }
      # 필요 시 테인트 예시 (여기는 테인트 없음)
      # taints = []
    }

    # 2) burst_spot: AL2023 ARM64, c7g.large/m7g.large, SPOT, min=0/desired=0/max=10, spotOnly 테인트
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
      # spot 전용으로 스케줄링되도록 테인트 추가
      taints = [{
        key    = "spotOnly"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }

    # 3) fallback_x86_spot(옵션): AL2023 X86_64, t3a.medium/m6a.large, SPOT, amd64Only 테인트
    #    필요 시 스케일 아웃을 위해 활성화하여 사용합니다.
    fallback_x86_spot = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["t3a.medium", "m6a.large"]
      capacity_type  = "SPOT"

      # 기본 비활성처럼 동작하도록 0으로 시작 (원하면 desired/min 조정)
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

# 임시로 주석 처리 - 권한 문제 해결 후 활성화
# data "aws_eks_cluster" "this" { name = module.eks.cluster_name }
# data "aws_eks_cluster_auth" "this" { name = module.eks.cluster_name }

# provider "kubernetes" {
#   host                   = data.aws_eks_cluster.this.endpoint
#   cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_this.certificate_authority[0].data)
#   token                  = data.aws_eks_cluster_auth.this.token
# }
# provider "helm" {
#   kubernetes {
#     host                   = data.aws_eks_cluster.this.endpoint
#     cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
#     token                  = data.aws_eks_cluster_auth.this.token
#   }
# }

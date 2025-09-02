# =============================================================================
# 4단계: Kubernetes 프로바이더 및 애드온
# =============================================================================

# EKS 클러스터 데이터 소스 (클러스터 생성 후 사용)
data "aws_eks_cluster" "this" {
  name       = module.eks.cluster_name
  depends_on = [module.eks]
}

data "aws_eks_cluster_auth" "this" {
  name       = module.eks.cluster_name
  depends_on = [module.eks]
}

# Kubernetes 프로바이더 설정
provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

# Helm 프로바이더 설정
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

# IRSA (IAM Roles for Service Accounts) 모듈들
module "iam_irsa_alb" {
  source                                 = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version                                = "~> 5.34"
  role_name_prefix                       = "irsa-alb-"
  attach_load_balancer_controller_policy = true
  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

module "iam_irsa_ebs" {
  source                = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version               = "~> 5.34"
  role_name_prefix      = "irsa-ebs-"
  attach_ebs_csi_policy = true
  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}

module "iam_irsa_extdns" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version                       = "~> 5.34"
  role_name_prefix              = "irsa-extdns-"
  attach_external_dns_policy    = true
  external_dns_hosted_zone_arns = ["arn:aws:route53:::hostedzone/Z07840551WEY8ZLTWDLBJ"]
  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:external-dns"]
    }
  }
}

# 클러스터 엔드포인트가 완전히 준비되도록 대기 후 애드온 적용
resource "time_sleep" "cluster_ready" {
  create_duration = "120s"
  depends_on = [
    data.aws_eks_cluster.this,
    data.aws_eks_cluster_auth.this
  ]
}

# AWS Load Balancer Controller
resource "helm_release" "alb" {
  depends_on = [time_sleep.cluster_ready]
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.8.1"
  values = [yamlencode({
    clusterName = module.eks.cluster_name
    region      = "ap-northeast-2"
    vpcId       = module.vpc.vpc_id
    serviceAccount = {
      name        = "aws-load-balancer-controller"
      annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_alb.iam_role_arn }
    }
  })]
}

# ALB 컨트롤러가 웹훅/엔드포인트까지 준비되도록 추가 대기
resource "time_sleep" "alb_ready" {
  create_duration = "60s"
  depends_on      = [helm_release.alb]
}

# AWS EBS CSI Driver
resource "helm_release" "ebs" {
  depends_on = [time_sleep.cluster_ready]
  name       = "aws-ebs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-ebs-csi-driver"
  chart      = "aws-ebs-csi-driver"
  namespace  = "kube-system"
  version    = "2.32.0"
  values = [yamlencode({
    controller = {
      serviceAccount = {
        create      = true
        name        = "ebs-csi-controller-sa"
        annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_ebs.iam_role_arn }
      }
    }
  })]
}

# External DNS
resource "helm_release" "extdns" {
  depends_on = [time_sleep.cluster_ready]
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.15.0"
  values = [yamlencode({
    serviceAccount = {
      name        = "external-dns"
      annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_extdns.iam_role_arn }
    }
    provider      = "aws"
    policy        = "upsert-only"
    domainFilters = [var.domain]
    txtOwnerId    = "${var.project}-eks"
  })]
}

# Ingress Nginx
resource "helm_release" "ingress" {
  depends_on       = [time_sleep.cluster_ready, time_sleep.alb_ready]
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  version          = "4.11.2"
  values = [yamlencode({
    controller = {
      service = {
        annotations = {
          "service.beta.kubernetes.io/aws-load-balancer-type"                     = "nlb"
          "service.beta.kubernetes.io/aws-load-balancer-internal"                 = "true"
          "service.beta.kubernetes.io/aws-load-balancer-name"                     = "msa-forum-ingress-nlb"
          "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags" = "kubernetes.io/service-name=ingress-nginx/ingress-nginx-controller"
        }
      }
    }
  })]
}

# Metrics Server
resource "helm_release" "metrics" {
  depends_on = [time_sleep.cluster_ready]
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.12.1"
  values     = [yamlencode({ args = ["--kubelet-insecure-tls"] })]
}

# Cluster Autoscaler
resource "helm_release" "cluster_autoscaler" {
  depends_on = [time_sleep.cluster_ready]
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.42.0"

  values = [yamlencode({
    autoDiscovery = {
      clusterName = module.eks.cluster_name
    }
    awsRegion = "ap-northeast-2"
    rbac = {
      serviceAccount = {
        create = true
        name   = "cluster-autoscaler"
      }
    }
    extraArgs = {
      balance-similar-node-groups   = true
      skip-nodes-with-local-storage = false
      skip-nodes-with-system-pods   = false
      expander                      = "least-waste"
    }
  })]
}

# AWS Node Termination Handler
resource "helm_release" "node_termination_handler" {
  depends_on = [time_sleep.cluster_ready]
  name       = "aws-node-termination-handler"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-node-termination-handler"
  namespace  = "kube-system"
  version    = "0.21.0"

  values = [yamlencode({
    enableSqsTerminationDraining   = false
    enableSpotInterruptionDraining = true
    enableRebalanceDraining        = true
    nodeSelector = {
      "kubernetes.io/arch" = "arm64"
    }
    tolerations = [
      {
        key      = "spotOnly"
        operator = "Exists"
        effect   = "NoSchedule"
      },
      {
        key      = "amd64Only"
        operator = "Exists"
        effect   = "NoSchedule"
      }
    ]
  })]
}

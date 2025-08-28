module "iam_irsa_alb" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.34"
  role_name_prefix = "irsa-alb-"
  attach_load_balancer_controller_policy = true
  oidc_providers = {
    this = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

module "iam_irsa_ebs" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.34"
  role_name_prefix = "irsa-ebs-"
  attach_ebs_csi_policy = true
  oidc_providers = {
    this = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}

module "iam_irsa_extdns" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.34"
  role_name_prefix = "irsa-extdns-"
  attach_external_dns_policy = true
  external_dns_hosted_zone_arns = ["arn:aws:route53::245040175511:hostedzone/Z07840551WEY8ZLTWDLBJ"]
  oidc_providers = {
    this = {
      provider_arn = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:external-dns"]
    }
  }
}

resource "helm_release" "alb" {
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
      name = "aws-load-balancer-controller"
      annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_alb.iam_role_arn }
    }
  })]
}

resource "helm_release" "ebs" {
  name       = "aws-ebs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-ebs-csi-driver"
  chart      = "aws-ebs-csi-driver"
  namespace  = "kube-system"
  version    = "2.32.0"
  values = [yamlencode({
    controller = {
      serviceAccount = {
        create = true
        name   = "ebs-csi-controller-sa"
        annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_ebs.iam_role_arn }
      }
    }
  })]
}

resource "helm_release" "extdns" {
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.15.0"
  values = [yamlencode({
    serviceAccount = {
      name = "external-dns"
      annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_extdns.iam_role_arn }
    }
    provider     = "aws"
    policy       = "upsert-only"
    domainFilters = [var.domain]
    txtOwnerId   = "${var.project}-eks"
  })]
}

resource "helm_release" "ingress" {
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
          "service.beta.kubernetes.io/aws-load-balancer-type"     = "nlb"
          "service.beta.kubernetes.io/aws-load-balancer-internal" = "true"
        }
      }
    }
  })]
}

resource "helm_release" "metrics" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.12.1"
  values     = [yamlencode({ args = ["--kubelet-insecure-tls"] })]
}

# -----------------------------------------------------------------------------
# Cluster Autoscaler 설치 (노드 자동 확장)
# - eks_managed_node_groups 와 함께 사용 시 autoDiscovery.clusterName 사용
# - IRSA 별도 구성 시 서비스어카운트에 주석 추가 가능(예: eks.amazonaws.com/role-arn)
resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.42.0" # Kubernetes 1.30 호환 차트 버전 확인 권장

  values = [yamlencode({
    autoDiscovery = {
      clusterName = module.eks.cluster_name
    }
    awsRegion = "ap-northeast-2"
    rbac = {
      serviceAccount = {
        create = true
        name   = "cluster-autoscaler"
        # annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_autoscaler.iam_role_arn } # IRSA 사용 시
      }
    }
    extraArgs = {
      balance-similar-node-groups           = true
      skip-nodes-with-local-storage         = false
      skip-nodes-with-system-pods           = false
      expander                              = "least-waste"
    }
  })]
}

# -----------------------------------------------------------------------------
# AWS Node Termination Handler 설치 (스팟 중단/재조정 이벤트 시 안전 종료)
# - IMDS 감지 모드 사용, 스팟/스케줄드 유지보수/재조정 이벤트를 처리
resource "helm_release" "node_termination_handler" {
  name       = "aws-node-termination-handler"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-node-termination-handler"
  namespace  = "kube-system"
  version    = "0.21.0"

  values = [yamlencode({
    enableSqsTerminationDraining = false   # SQS 사용 안함(간단 구성)
    enableSpotInterruptionDraining = true  # 스팟 중단 시 드레이닝
    enableRebalanceDraining = true         # 재조정 이벤트 처리
    nodeSelector = {                       # 데몬셋이 특정 아키텍처에 배포되도록 설정 예시
      "kubernetes.io/arch" = "arm64"
    }
    tolerations = [                        # 스팟/전용 테인트가 있어도 스케줄 가능
      {
        key = "spotOnly"
        operator = "Exists"
        effect = "NoSchedule"
      },
      {
        key = "amd64Only"
        operator = "Exists"
        effect = "NoSchedule"
      }
    ]
  })]
}

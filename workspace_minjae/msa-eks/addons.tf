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
          "service.beta.kubernetes.io/aws-load-balancer-type"       = "nlb"
          "service.beta.kubernetes.io/aws-load-balancer-internal"   = "true"
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

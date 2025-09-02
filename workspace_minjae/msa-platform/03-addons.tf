data "aws_eks_cluster" "this" {
  name       = module.eks.cluster_name
  depends_on = [module.eks]
}
data "aws_eks_cluster_auth" "this" {
  name       = module.eks.cluster_name
  depends_on = [module.eks]
}

provider "kubernetes" {
  alias                  = "eks"
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  alias = "eks"
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

resource "time_sleep" "cluster_ready" {
  depends_on      = [module.eks]
  create_duration = "120s"
}

module "iam_irsa_alb" {
  source                                 = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version                                = "~> 5.34"
  role_name_prefix                       = "irsa-alb-"
  attach_load_balancer_controller_policy = true
  oidc_providers                         = { this = { provider_arn = module.eks.oidc_provider_arn, namespace_service_accounts = ["kube-system:aws-load-balancer-controller"] } }
}

module "iam_irsa_ebs" {
  source                = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version               = "~> 5.34"
  role_name_prefix      = "irsa-ebs-"
  attach_ebs_csi_policy = true
  oidc_providers        = { this = { provider_arn = module.eks.oidc_provider_arn, namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"] } }
}

module "iam_irsa_extdns" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version                       = "~> 5.34"
  role_name_prefix              = "irsa-extdns-"
  attach_external_dns_policy    = true
  external_dns_hosted_zone_arns = ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"]
  oidc_providers                = { this = { provider_arn = module.eks.oidc_provider_arn, namespace_service_accounts = ["kube-system:external-dns"] } }
}

resource "helm_release" "alb" {
  count      = var.enable_addons ? 1 : 0
  provider   = helm.eks
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.8.1"
  depends_on = [time_sleep.cluster_ready]
  values = [yamlencode({
    clusterName    = module.eks.cluster_name
    region         = var.region
    vpcId          = module.vpc.vpc_id
    serviceAccount = { name = "aws-load-balancer-controller", annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_alb.iam_role_arn } }
  })]
}

resource "helm_release" "ebs" {
  count      = var.enable_addons ? 1 : 0
  provider   = helm.eks
  name       = "aws-ebs-csi-driver"
  repository = "https://kubernetes-sigs.github.io/aws-ebs-csi-driver"
  chart      = "aws-ebs-csi-driver"
  namespace  = "kube-system"
  version    = "2.32.0"
  depends_on = [time_sleep.cluster_ready]
  values     = [yamlencode({ controller = { serviceAccount = { create = true, name = "ebs-csi-controller-sa", annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_ebs.iam_role_arn } } } })]
}

resource "helm_release" "extdns" {
  count      = var.enable_addons ? 1 : 0
  provider   = helm.eks
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.15.0"
  depends_on = [time_sleep.cluster_ready]
  values = [yamlencode({
    serviceAccount = { name = "external-dns", annotations = { "eks.amazonaws.com/role-arn" = module.iam_irsa_extdns.iam_role_arn } }
    provider       = "aws"
    policy         = "upsert-only"
    domainFilters  = [var.domain]
    txtOwnerId     = "${var.project}-eks"
  })]
}

resource "helm_release" "ingress" {
  count            = var.enable_addons ? 1 : 0
  provider         = helm.eks
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  version          = "4.11.2"
  depends_on       = [time_sleep.cluster_ready, helm_release.alb]
  values = [yamlencode({ controller = { service = { annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-type"                     = "nlb",
    "service.beta.kubernetes.io/aws-load-balancer-internal"                 = "true",
    "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags" = "Project=${var.project},Env=${var.env},Component=ingress,Service=ingress-nginx-controller,ManagedBy=Terraform"
  } } } })]
}



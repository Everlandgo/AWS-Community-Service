locals {
  tags = {
    Project   = var.project
    Env       = var.env
    ManagedBy = "Terraform"
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.project}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b"]
  public_subnets  = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = local.tags
}

resource "aws_security_group" "vpce_sg" {
  name        = "${var.project}-vpce-sg"
  description = "VPCe SG"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

locals {
  interface_services = [
    "com.amazonaws.${var.region}.ecr.api",
    "com.amazonaws.${var.region}.ecr.dkr",
    "com.amazonaws.${var.region}.logs",
    "com.amazonaws.${var.region}.sts",
    "com.amazonaws.${var.region}.secretsmanager",
    "com.amazonaws.${var.region}.kms",
    "com.amazonaws.${var.region}.ssm",
    "com.amazonaws.${var.region}.ssmmessages"
  ]
}

resource "aws_vpc_endpoint" "interface" {
  for_each            = toset(local.interface_services)
  vpc_id              = module.vpc.vpc_id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpce_sg.id]
  tags                = local.tags
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(module.vpc.public_route_table_ids, module.vpc.private_route_table_ids)
  tags              = local.tags
}



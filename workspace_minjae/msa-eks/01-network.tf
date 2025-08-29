# =============================================================================
# 1단계: 네트워크 인프라 (VPC, 서브넷, VPC 엔드포인트)
# =============================================================================

# VPC 모듈
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.project}-vpc"
  cidr = var.vpc_cidr

  azs             = var.public_azs
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

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# VPC 엔드포인트 보안 그룹
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
  
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# VPC 엔드포인트 서비스 목록
locals {
  interface_services = [
    "com.amazonaws.ap-northeast-2.ecr.api",
    "com.amazonaws.ap-northeast-2.ecr.dkr",
    "com.amazonaws.ap-northeast-2.logs",
    "com.amazonaws.ap-northeast-2.sts",
    "com.amazonaws.ap-northeast-2.secretsmanager",
    "com.amazonaws.ap-northeast-2.kms",
    "com.amazonaws.ap-northeast-2.ssm",
    "com.amazonaws.ap-northeast-2.ssmmessages"
  ]
}

# 인터페이스 VPC 엔드포인트
resource "aws_vpc_endpoint" "interface" {
  for_each            = toset(local.interface_services)
  vpc_id              = module.vpc.vpc_id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpce_sg.id]
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# S3 게이트웨이 VPC 엔드포인트
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.ap-northeast-2.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(module.vpc.public_route_table_ids, module.vpc.private_route_table_ids)
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 출력값
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID"
}

output "vpc_cidr_block" {
  value       = module.vpc.vpc_cidr_block
  description = "VPC CIDR block"
}

output "private_subnets" {
  value       = module.vpc.private_subnets
  description = "Private subnet IDs"
}

output "public_subnets" {
  value       = module.vpc.public_subnets
  description = "Public subnet IDs"
}

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

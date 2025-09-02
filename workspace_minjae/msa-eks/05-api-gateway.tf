# =============================================================================
# 5단계: API Gateway
# =============================================================================

# API Gateway 보안 그룹
resource "aws_security_group" "apigw_sg" {
  name        = "${var.project}-apigw-sg"
  description = "API Gateway VPC Link Security Group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

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

# VPC Link (NLB와 같은 VPC/프라이빗 서브넷)
resource "aws_apigatewayv2_vpc_link" "vpclink" {
  name               = "${var.project}-vpclink"
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.apigw_sg.id]

  tags = {
    Project = var.project
    Env     = var.env
  }
  count = var.enable_apigw ? 1 : 0
}

# HTTP API
resource "aws_apigatewayv2_api" "httpapi" {
  name          = "${var.project}-httpapi"
  protocol_type = "HTTP"

  tags = {
    Project = var.project
    Env     = var.env
  }
  count = var.enable_apigw ? 1 : 0
}

# Ingress NLB 리스너 ARN을 자동으로 참조
data "aws_lb" "ingress_nlb" {
  count = var.enable_apigw ? 1 : 0
  name  = "msa-forum-ingress-nlb"
}

data "aws_lb_listener" "ingress_https" {
  count             = var.enable_apigw ? 1 : 0
  load_balancer_arn = data.aws_lb.ingress_nlb[0].arn
  port              = 80
}

# Integration (HTTP_PROXY via VPC_LINK)
resource "aws_apigatewayv2_integration" "nlb_proxy" {
  count                  = var.enable_apigw ? 1 : 0
  api_id                 = aws_apigatewayv2_api.httpapi[0].id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = data.aws_lb_listener.ingress_https[0].arn
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.vpclink[0].id
  payload_format_version = "1.0"
  timeout_milliseconds   = 29000
}

# /v1/* 라우팅 (모든 하위 경로)
resource "aws_apigatewayv2_route" "v1_proxy" {
  count     = var.enable_apigw ? 1 : 0
  api_id    = aws_apigatewayv2_api.httpapi[0].id
  route_key = "ANY /v1/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.nlb_proxy[0].id}"
}

# Stage
resource "aws_apigatewayv2_stage" "prod" {
  count       = var.enable_apigw ? 1 : 0
  api_id      = aws_apigatewayv2_api.httpapi[0].id
  name        = "prod"
  auto_deploy = true

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 출력값
output "httpapi_invoke_url" {
  value       = var.enable_apigw && length(aws_apigatewayv2_api.httpapi) > 0 ? "${aws_apigatewayv2_api.httpapi[0].api_endpoint}/prod" : null
  description = "API Gateway HTTP API invoke URL"
}

output "vpc_link_id" {
  value       = var.enable_apigw && length(aws_apigatewayv2_vpc_link.vpclink) > 0 ? aws_apigatewayv2_vpc_link.vpclink[0].id : null
  description = "VPC Link ID for API Gateway"
}

output "api_id" {
  value       = var.enable_apigw && length(aws_apigatewayv2_api.httpapi) > 0 ? aws_apigatewayv2_api.httpapi[0].id : null
  description = "HTTP API ID"
}

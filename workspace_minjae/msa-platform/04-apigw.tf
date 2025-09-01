############################
# Lambda + HTTP API (v2)
############################

locals {
  cors_allowed_origins = ["https://${var.service_domain}"]
}

data "archive_file" "lambda_health_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/health"
  output_path = "${path.module}/lambda/health.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project}-${var.env}-lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "health" {
  filename         = data.archive_file.lambda_health_zip.output_path
  function_name    = "${var.project}-${var.env}-health"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_health_zip.output_base64sha256
  timeout          = 5
  environment { variables = { STAGE = var.env } }
}

resource "aws_apigatewayv2_api" "httpapi" {
  count         = var.enable_apigw ? 1 : 0
  name          = "${var.project}-httpapi"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["Authorization", "Content-Type"]
    allow_methods = ["GET", "OPTIONS"]
    allow_origins = local.cors_allowed_origins
  }
  tags = { Project = var.project, Env = var.env }
}

resource "aws_apigatewayv2_stage" "default" {
  count       = var.enable_apigw ? 1 : 0
  api_id      = aws_apigatewayv2_api.httpapi[0].id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_health" {
  count            = var.enable_apigw ? 1 : 0
  api_id           = aws_apigatewayv2_api.httpapi[0].id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  count     = var.enable_apigw ? 1 : 0
  api_id    = aws_apigatewayv2_api.httpapi[0].id
  route_key = "GET /api/health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_health[0].id}"
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowInvokeFromAPIGW"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.httpapi[0].execution_arn}/*/*"
  depends_on    = [aws_apigatewayv2_api.httpapi]
}

############################
# Cognito + JWT Authorizer
############################

data "aws_cognito_user_pool" "this" {
  name = var.cognito_user_pool_name
}

data "aws_cognito_user_pool_clients" "this" {
  user_pool_id = data.aws_cognito_user_pool.this.id
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  count               = var.enable_apigw ? 1 : 0
  api_id              = aws_apigatewayv2_api.httpapi[0].id
  authorizer_type     = "JWT"
  identity_sources    = ["$request.header.Authorization"]
  name                = "cognito-jwt"
  jwt_configuration {
    audience = length(data.aws_cognito_user_pool_clients.this.client_ids) > 0 ? [data.aws_cognito_user_pool_clients.this.client_ids[0]] : []
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${data.aws_cognito_user_pool.this.id}"
  }
}

resource "aws_apigatewayv2_integration" "lambda_me" {
  count            = var.enable_apigw ? 1 : 0
  api_id           = aws_apigatewayv2_api.httpapi[0].id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "me" {
  count               = var.enable_apigw ? 1 : 0
  api_id              = aws_apigatewayv2_api.httpapi[0].id
  route_key           = "GET /api/me"
  target              = "integrations/${aws_apigatewayv2_integration.lambda_me[0].id}"
  authorization_type  = "JWT"
  authorizer_id       = aws_apigatewayv2_authorizer.jwt[0].id
}

output "httpapi_invoke_url" {
  value       = var.enable_apigw && length(aws_apigatewayv2_api.httpapi) > 0 ? aws_apigatewayv2_api.httpapi[0].api_endpoint : null
  description = "API Gateway HTTP API base endpoint (default stage)"
}

output "cognito_user_pool_id" { value = aws_cognito_user_pool.this.id }
output "cognito_app_client_id" { value = aws_cognito_user_pool_client.spa.id }



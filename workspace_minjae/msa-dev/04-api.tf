locals {
  cors_allowed_origins = ["https://${var.service_domain}"]
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project}-${var.env}-lambda-exec"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" } }] })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "health" {
  filename         = "${path.module}/lambda/health.zip"
  function_name    = "${var.project}-${var.env}-health"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("${path.module}/lambda/health.zip")
  timeout          = 5
}

resource "aws_lambda_function" "me" {
  filename         = "${path.module}/lambda/me.zip"
  function_name    = "${var.project}-${var.env}-me"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("${path.module}/lambda/me.zip")
  timeout          = 5
}

resource "aws_apigatewayv2_api" "httpapi" {
  count         = var.enable_apigw ? 1 : 0
  name          = "${var.project}-httpapi"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["Authorization","Content-Type"]
    allow_methods = ["GET","OPTIONS"]
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
  count                  = var.enable_apigw ? 1 : 0
  api_id                 = aws_apigatewayv2_api.httpapi[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  count     = var.enable_apigw ? 1 : 0
  api_id    = aws_apigatewayv2_api.httpapi[0].id
  route_key = "GET /api/health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_health[0].id}"
}

resource "aws_lambda_permission" "apigw_health" {
  count         = var.enable_apigw ? 1 : 0
  statement_id  = "AllowInvokeFromAPIGWHealth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.httpapi[0].execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "lambda_me" {
  count                  = var.enable_apigw ? 1 : 0
  api_id                 = aws_apigatewayv2_api.httpapi[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.me.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  count               = var.enable_apigw && var.cognito_user_pool_id != "" && var.cognito_app_client_id != "" ? 1 : 0
  api_id              = aws_apigatewayv2_api.httpapi[0].id
  authorizer_type     = "JWT"
  identity_sources    = ["$request.header.Authorization"]
  name                = "cognito-jwt"
  jwt_configuration {
    audience = [var.cognito_app_client_id]
    issuer   = "https://cognito-idp.ap-northeast-2.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

resource "aws_apigatewayv2_route" "me" {
  count              = var.enable_apigw && var.cognito_user_pool_id != "" && var.cognito_app_client_id != "" ? 1 : 0
  api_id             = aws_apigatewayv2_api.httpapi[0].id
  route_key          = "GET /api/me"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_me[0].id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt[0].id
}

resource "aws_lambda_permission" "apigw_me" {
  count         = var.enable_apigw && var.cognito_user_pool_id != "" && var.cognito_app_client_id != "" ? 1 : 0
  statement_id  = "AllowInvokeFromAPIGWMe"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.me.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.httpapi[0].execution_arn}/*/*"
}

output "dev_httpapi_invoke_url" { value = var.enable_apigw && length(aws_apigatewayv2_api.httpapi) > 0 ? aws_apigatewayv2_api.httpapi[0].api_endpoint : null }

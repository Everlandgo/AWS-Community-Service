locals {
  web_tags = { Project = var.project, Env = var.env, ManagedBy = "Terraform" }
}

resource "aws_s3_bucket" "web" {
  count  = var.enable_web ? 1 : 0
  bucket = var.web_bucket_name
  tags   = local.web_tags
}

resource "aws_s3_bucket_public_access_block" "web" {
  count                   = var.enable_web ? 1 : 0
  bucket                  = aws_s3_bucket.web[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_acm_certificate" "web" {
  count                     = var.enable_web ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.domain
  subject_alternative_names = [var.service_domain]
  validation_method         = "DNS"
  tags                      = local.web_tags
}

data "aws_route53_zone" "primary" {
  count        = var.enable_web ? 1 : 0
  name         = var.domain
  private_zone = false
}

resource "aws_route53_record" "web_cert" {
  for_each = var.enable_web ? { for dvo in aws_acm_certificate.web[0].domain_validation_options : dvo.domain_name => {
    name  = dvo.resource_record_name
    type  = dvo.resource_record_type
    value = dvo.resource_record_value
  } } : {}

  zone_id         = data.aws_route53_zone.primary[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "web" {
  count                   = var.enable_web ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.web[0].arn
  validation_record_fqdns = [for r in aws_route53_record.web_cert : r.fqdn]
}

resource "aws_cloudfront_origin_access_control" "web" {
  count                             = var.enable_web ? 1 : 0
  name                              = "${var.project}-${var.env}-web-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_s3_bucket" "web" {
  count  = var.enable_web ? 1 : 0
  bucket = aws_s3_bucket.web[0].bucket
}

data "aws_cloudfront_cache_policy" "optimized" {
  count = var.enable_web ? 1 : 0
  name  = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  count = var.enable_web ? 1 : 0
  name  = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  count = var.enable_web ? 1 : 0
  name  = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "web" {
  count               = var.enable_web ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project}-${var.env}-web"
  default_root_object = "index.html"
  aliases             = [var.service_domain]

  origin {
    domain_name              = data.aws_s3_bucket.web[0].bucket_regional_domain_name
    origin_id                = "s3-web"
    origin_access_control_id = aws_cloudfront_origin_access_control.web[0].id
  }

  dynamic "origin" {
    for_each = var.enable_apigw ? [1] : []
    content {
      domain_name = replace(aws_apigatewayv2_api.httpapi[0].api_endpoint, "https://", "")
      origin_id   = "api-origin"
      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized[0].id
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.enable_apigw ? [1] : []
    content {
      path_pattern             = "/api/*"
      target_origin_id         = "api-origin"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD", "OPTIONS"]
      compress                 = true
      cache_policy_id          = data.aws_cloudfront_cache_policy.disabled[0].id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host[0].id
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.web[0].certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.web_tags
}

data "aws_iam_policy_document" "oac" {
  count = var.enable_web ? 1 : 0
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.web[0].arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "web" {
  count  = var.enable_web ? 1 : 0
  bucket = aws_s3_bucket.web[0].id
  policy = data.aws_iam_policy_document.oac[0].json
}

resource "aws_route53_record" "web_alias_a" {
  count   = var.enable_web ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = var.service_domain
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.web[0].domain_name
    zone_id                = aws_cloudfront_distribution.web[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "web_alias_aaaa" {
  count   = var.enable_web ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = var.service_domain
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.web[0].domain_name
    zone_id                = aws_cloudfront_distribution.web[0].hosted_zone_id
    evaluate_target_health = false
  }
}

output "cloudfront_domain_name" {
  value       = var.enable_web && length(aws_cloudfront_distribution.web) > 0 ? aws_cloudfront_distribution.web[0].domain_name : null
  description = "CloudFront domain name"
}

output "website_url" {
  value       = var.enable_web ? "https://${var.service_domain}" : null
  description = "Public website URL"
}

output "cloudfront_distribution_id" {
  value       = var.enable_web && length(aws_cloudfront_distribution.web) > 0 ? aws_cloudfront_distribution.web[0].id : null
  description = "CloudFront distribution ID"
}

output "web_bucket_name" {
  value       = var.enable_web ? var.web_bucket_name : null
  description = "S3 bucket name for static website"
}



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

provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "hhottdogg-deploy"
  assume_role {
    role_arn     = "arn:aws:iam::245040175511:role/TerraformDeployerRole"
    session_name = "tf-apply"
  }
}

variable "acm_certificate_arn" {
  type        = string
  default     = "arn:aws:acm:us-east-1:245040175511:certificate/270f51d3-b1a9-4347-b38d-78a1066402cc"
  description = "Existing ACM certificate for CloudFront (us-east-1)"
}

data "aws_route53_zone" "primary" {
  count        = var.enable_web ? 1 : 0
  name         = var.domain
  private_zone = false
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

  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized[0].id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
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
  count  = var.enable_web ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = var.service_domain
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.web[0].domain_name
    zone_id                = aws_cloudfront_distribution.web[0].hosted_zone_id
    evaluate_target_health = false
  }
}

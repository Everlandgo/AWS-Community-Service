locals {
  cf_oac_name = "${var.project}-${var.env}-oac"
  tags = {
    Project   = var.project
    Env       = var.env
    ManagedBy = "Terraform"
  }
}

# 1) S3 bucket for static website (private; accessed via CloudFront OAC)
resource "aws_s3_bucket" "website" {
  bucket = var.website_bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# (선택) 기본 index.html 업로드 예시용
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.website.id
  key          = "index.html"
  content      = "<html><head><title>${var.project}</title></head><body><h1>${var.project} ${var.env}</h1></body></html>"
  content_type = "text/html"
}

# 2) ACM certificate in us-east-1 for CloudFront
resource "aws_acm_certificate" "cf" {
  provider          = aws.us_east_1
  domain_name       = var.domain
  validation_method = "DNS"
  tags              = local.tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cf.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "cf" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cf.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# 3) CloudFront with OAC
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = local.cf_oac_name
  description                       = "OAC for ${var.project} ${var.env} website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_s3_bucket" "website" {
  bucket = aws_s3_bucket.website.bucket
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project}-${var.env}-web"
  default_root_object = "index.html"

  aliases = [var.domain]

  origin {
    domain_name = data.aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "s3-website"

    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-website"

    viewer_protocol_policy = "redirect-to-https"

    compress = true
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cf.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.tags
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# 4) S3 bucket policy for OAC
data "aws_iam_policy_document" "s3_oac" {
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.website.arn}/*"
    ]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.s3_oac.json
}

# 5) Route53 records for CloudFront
data "aws_route53_zone" "primary" {
  name         = var.domain
  private_zone = false
}

resource "aws_route53_record" "root_alias" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}



variable "project" {
  type    = string
  default = "msa-forum"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "domain" {
  type        = string
  default     = "hhottdogg.shop"
  description = "Root domain for the website"
}

variable "website_bucket_name" {
  type        = string
  default     = "karina-winter"
  description = "S3 bucket name to host website content"
}

variable "acm_certificate_arn" {
  type        = string
  default     = "arn:aws:acm:us-east-1:245040175511:certificate/270f51d3-b1a9-4347-b38d-78a1066402cc"
  description = "Existing ACM certificate ARN in us-east-1 for CloudFront"
}



variable "project" { type = string, default = "msa-forum" }
variable "env"     { type = string, default = "dev" }

variable "domain" {
  type        = string
  default     = "hhottdogg.shop"
  description = "Root domain for the website"
}

variable "website_bucket_name" {
  type        = string
  default     = "hhottdogg.shop"
  description = "S3 bucket name to host website content"
}



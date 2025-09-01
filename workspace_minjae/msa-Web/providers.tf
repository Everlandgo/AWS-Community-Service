terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

variable "region" {
  type        = string
  default     = "ap-northeast-2"
  description = "Primary AWS region (for S3/Route53 ops)"
}

provider "aws" {
  region = var.region
}

# CloudFront requires ACM certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}



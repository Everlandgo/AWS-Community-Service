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
  type    = string
  default = "ap-northeast-2"
}

provider "aws" {
  region  = var.region
  profile = "hhottdogg-deploy"
  assume_role {
    role_arn     = "arn:aws:iam::245040175511:role/TerraformDeployerRole"
    session_name = "tf-apply"
  }
}

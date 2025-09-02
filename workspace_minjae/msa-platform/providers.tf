terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
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

provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = "hhottdogg-deploy"
  assume_role {
    role_arn     = "arn:aws:iam::245040175511:role/TerraformDeployerRole"
    session_name = "tf-apply"
  }
}



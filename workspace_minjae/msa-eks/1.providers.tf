terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.60" }
    helm       = { source = "hashicorp/helm", version = "~> 2.13" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.32" }
  }
}
provider "aws" {
  region  = "ap-northeast-2"
  profile = "deploy-s3-frontend"
  assume_role {
    role_arn     = "arn:aws:iam::245040175511:role/TerraformDeployerRole"
    session_name = "tf-apply"
  }
}
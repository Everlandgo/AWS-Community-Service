terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws         = { source = "hashicorp/aws",         version = "~> 5.60" }
    helm        = { source = "hashicorp/helm",        version = "~> 2.13" }
    kubernetes  = { source = "hashicorp/kubernetes",  version = "~> 2.32" }
  }
}
provider "aws" {
  region  = "ap-northeast-2"
}

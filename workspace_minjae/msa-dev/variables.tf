variable "project" {
  type    = string
  default = "msa-forum"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "az" {
  type        = string
  default     = "ap-northeast-2a"
  description = "Single availability zone to use for all subnets"
}

variable "domain" {
  type    = string
  default = "hhottdogg.shop"
}

variable "service_domain" {
  type    = string
  default = "www.hhottdogg.shop"
}

variable "web_bucket_name" {
  type    = string
  default = "karina-winter"
}

variable "enable_web" {
  type    = bool
  default = true
}

variable "enable_apigw" {
  type    = bool
  default = true
}

variable "cognito_user_pool_id" {
  type        = string
  default     = ""
  description = "Optional: existing User Pool ID for JWT authorizer"
}

variable "cognito_app_client_id" {
  type        = string
  default     = ""
  description = "Optional: existing App Client ID for JWT authorizer"
}

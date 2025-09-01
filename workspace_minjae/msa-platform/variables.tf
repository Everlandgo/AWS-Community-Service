variable "project" {
  type    = string
  default = "msa-forum"
}
variable "env" {
  type    = string
  default = "dev"
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
  default = "hhottdogg-web"
}
variable "hosted_zone_id" {
  type    = string
  default = "Z07840551WEY8ZLTWDLBJ"
}

variable "enable_apigw" {
  type    = bool
  default = false
}
variable "enable_web" {
  type    = bool
  default = false
}

variable "enable_addons" {
  type    = bool
  default = true
}

variable "cognito_user_pool_name" {
  type    = string
  default = "sungjuntest"
}



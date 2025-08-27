variable "project" { type = string  default = "msa-forum" }
variable "env"     { type = string  default = "dev" }
variable "vpc_cidr"{ type = string  default = "10.0.0.0/16" }
variable "public_azs"  { type = list(string) default = ["ap-northeast-2a","ap-northeast-2b"] }
variable "private_azs" { type = list(string) default = ["ap-northeast-2a","ap-northeast-2b"] }

variable "hosted_zone_id" { type = string default = "Z07840551WEY8ZLTWDLBJ" }
variable "domain"         { type = string default = "hhottdogg.shop" }

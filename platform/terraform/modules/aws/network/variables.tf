terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "flow_logs_kms_key_id" {
  type    = string
  default = null
}
variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}
variable "private_cidr" {
  type    = string
  default = "10.40.0.0/20"
}
variable "public_cidr" {
  type    = string
  default = "10.40.16.0/20"
}
variable "tags" {
  type    = map(string)
  default = {}
}

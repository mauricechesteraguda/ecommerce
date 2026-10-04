terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "origin_domain" {
  type = string
}
variable "enabled" {
  type    = bool
  default = false
}
variable "waf_enabled" {
  type    = bool
  default = false
}

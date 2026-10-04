terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "bucket_name" {
  type = string
}
variable "enabled" {
  type    = bool
  default = false
}

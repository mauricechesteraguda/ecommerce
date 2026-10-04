terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "kms_key_arn" {
  type    = string
  default = null
}
variable "retention_count" {
  type    = number
  default = 50
}

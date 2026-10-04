terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "kms_key_name" {
  type    = string
  default = null
}
variable "location" {
  type = string
}
variable "project_id" {
  type = string
}

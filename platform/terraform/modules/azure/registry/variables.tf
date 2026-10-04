terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "location" {
  type = string
}
variable "resource_group_name" {
  type = string
}

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
variable "subnet_id" {
  type = string
}
variable "vm_size" {
  type    = string
  default = "Standard_D4s_v5"
}
variable "min_nodes" {
  type    = number
  default = 3
}
variable "max_nodes" {
  type    = number
  default = 9
}
variable "log_analytics_workspace_id" {
  type    = string
  default = null
}

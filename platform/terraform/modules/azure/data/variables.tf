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
variable "admin_login" {
  type      = string
  sensitive = true
}
variable "admin_password" {
  type      = string
  sensitive = true
}
variable "backup_retention_days" {
  type    = number
  default = 14
}
variable "geo_redundant_backup_enabled" {
  type    = bool
  default = true
}
variable "db_sku" {
  type    = string
  default = "GP_Standard_D2s_v3"
}

terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "region" {
  type = string
}
variable "network_id" {
  type = string
}
variable "db_tier" {
  type    = string
  default = "db-custom-2-7680"
}
variable "redis_memory_gb" {
  type    = number
  default = 2
}
variable "kms_key_name" {
  type = string
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "backup_retention_days" {
  type    = number
  default = 14
}
variable "transaction_log_retention_days" {
  type    = number
  default = 7
}

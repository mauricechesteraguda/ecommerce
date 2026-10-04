terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "username" {
  type      = string
  sensitive = true
}
variable "password" {
  type      = string
  sensitive = true
}
variable "postgres_version" {
  type    = string
  default = "16.4"
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}
variable "storage_gb" {
  type    = number
  default = 100
}
variable "backup_retention_days" {
  type    = number
  default = 14
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}
variable "redis_snapshot_retention_days" {
  type    = number
  default = 14
}
variable "backup_window" {
  type    = string
  default = "03:00-04:00"
}
variable "kms_key_id" {
  type    = string
  default = null
}
variable "redis_auth_token" {
  type      = string
  sensitive = true
  default   = null
}

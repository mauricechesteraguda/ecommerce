terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "managed_zone_name" {
  type     = string
  default  = null
  nullable = true
}
variable "domain_name" {
  type     = string
  default  = null
  nullable = true
}
output "managed_zone_name" {
  value = var.managed_zone_name
}
output "domain_name" {
  value = var.domain_name
}

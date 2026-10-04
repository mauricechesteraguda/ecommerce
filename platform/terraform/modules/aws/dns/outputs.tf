terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "zone_id" {
  type     = string
  default  = null
  nullable = true
}
variable "domain_name" {
  type     = string
  default  = null
  nullable = true
}
output "zone_id" {
  value = var.zone_id
}
output "domain_name" {
  value = var.domain_name
}

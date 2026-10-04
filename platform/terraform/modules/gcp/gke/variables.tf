terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "project_id" {
  type = string
}
variable "region" {
  type = string
}
variable "network_id" {
  type = string
}
variable "subnetwork_id" {
  type = string
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "min_nodes" {
  type    = number
  default = 3
}
variable "max_nodes" {
  type    = number
  default = 9
}
variable "machine_type" {
  type    = string
  default = "e2-standard-4"
}

terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "node_role_arn" {
  type = string
}
variable "kms_key_arn" {
  type = string
}
variable "kubernetes_version" {
  type    = string
  default = "1.31"
}
variable "public_endpoint" {
  type    = bool
  default = false
}
variable "desired_nodes" {
  type    = number
  default = 3
}
variable "min_nodes" {
  type    = number
  default = 3
}
variable "max_nodes" {
  type    = number
  default = 9
}
variable "instance_types" {
  type    = list(string)
  default = ["t3.large"]
}

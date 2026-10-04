terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "name" {
  type = string
}
variable "cidr" {
  type    = string
  default = "10.50.0.0/16"
}
variable "regions" {
  type    = list(string)
  default = ["region-a", "region-b", "region-c"]
}

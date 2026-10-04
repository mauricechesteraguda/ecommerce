terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "secret_arns" {
  type      = list(string)
  sensitive = true
  default   = []
}

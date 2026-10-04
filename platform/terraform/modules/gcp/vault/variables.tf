terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

variable "secret_names" {
  type = list(string)
  # Secret names are identifiers, not secret values; keeping this non-sensitive
  # permits Terraform to use the bounded set as a resource instance key.
  default = []
}

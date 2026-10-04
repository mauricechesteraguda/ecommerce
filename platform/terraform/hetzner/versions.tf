terraform {
  required_version = ">= 1.9.8, < 2.0.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "= 1.49.1"

    }
    random = {
      source  = "hashicorp/random"
      version = "= 3.6.3"

    }

  }
}

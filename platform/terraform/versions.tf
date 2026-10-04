terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "= 5.70.0"
    }
    google = {
      source = "hashicorp/google", version = "= 6.12.0"
    }
    azurerm = {
      source = "hashicorp/azurerm", version = "= 4.15.0"
    }

  }
}

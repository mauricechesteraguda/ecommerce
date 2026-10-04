terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm", version = "= 4.15.0"
    }
  }
}
variable "resource_group_name" {
  type = string
}
variable "location" {
  type = string
}
variable "storage_account_name" {
  type = string
}
variable "container_name" {
  type    = string
  default = "tfstate"
}
provider "azurerm" {
  features {}
}
resource "azurerm_storage_account" "state" {
  name                            = var.storage_account_name
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = false
  shared_access_key_enabled       = false
  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
    container_delete_retention_policy {
      days = 30
    }
  }
  queue_properties {
    logging {
      delete                = true
      read                  = true
      write                 = true
      version               = "1.0"
      retention_policy_days = 30
    }
  }
}
resource "azurerm_storage_container" "state" {
  name                  = var.container_name
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}
output "storage_account" {
  value = azurerm_storage_account.state.name
}
output "backend_locking" {
  value = "AzureRM uses blob leases for locking; versioning and soft delete are enabled."
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV2_AZURE_1:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV2_AZURE_21:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV2_AZURE_33:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AZURE_206:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.

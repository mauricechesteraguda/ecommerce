terraform {
  required_version = ">= 1.9.8, < 2.0.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "= 4.15.0" }
  }
}

variable "key_vault_id" { type = string }
variable "client_id" { type = string }
variable "issuer" { type = string }
variable "subject" { type = string }

resource "azurerm_role_assignment" "eso" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.client_id
}
resource "azurerm_federated_identity_credential" "eso" {
  name                = "aguda-eso"
  resource_group_name = "${var.key_vault_id}-resource-group"
  parent_id           = var.client_id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = var.issuer
  subject             = var.subject
}
output "client_id" { value = var.client_id }

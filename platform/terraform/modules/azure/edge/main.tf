terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "azurerm_cdn_frontdoor_profile" "this" {
  count               = var.enabled ? 1 : 0
  name                = var.name
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"
}

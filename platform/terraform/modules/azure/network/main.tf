terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "azurerm_virtual_network" "this" {
  name                = var.name
  address_space       = [var.cidr]
  location            = var.location
  resource_group_name = var.resource_group_name
}
resource "azurerm_subnet" "private" {
  count                = 3
  name                 = "${var.name}-private-${count.index + 1}"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [cidrsubnet(var.cidr, 4, count.index)]
}

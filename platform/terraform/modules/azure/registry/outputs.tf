terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "login_server" {
  value = azurerm_container_registry.this.login_server
}
output "id" {
  value = azurerm_container_registry.this.id
}

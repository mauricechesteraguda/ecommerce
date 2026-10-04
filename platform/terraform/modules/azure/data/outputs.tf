terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}
output "redis_hostname" {
  value = azurerm_redis_cache.this.hostname
}

terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "postgres.database.azure.com"
  resource_group_name = var.resource_group_name
}
resource "azurerm_postgresql_flexible_server" "this" {
  name                         = var.name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "16"
  storage_mb                   = 32768
  sku_name                     = var.db_sku
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled
  administrator_login          = var.admin_login
  administrator_password       = var.admin_password
  zone                         = "1"
  delegated_subnet_id          = var.subnet_id
  private_dns_zone_id          = azurerm_private_dns_zone.postgres.id
}
resource "azurerm_redis_cache" "this" {
  name                          = "${var.name}-redis"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  capacity                      = 1
  family                        = "P"
  sku_name                      = "Premium"
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false
  redis_configuration {
    maxmemory_reserved              = 2
    maxfragmentationmemory_reserved = 2
  }
}
resource "azurerm_private_endpoint" "postgres" {
  name                = "${var.name}-postgres-private-endpoint"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id
  private_service_connection {
    name                           = "${var.name}-postgres"
    private_connection_resource_id = azurerm_postgresql_flexible_server.this.id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }
}

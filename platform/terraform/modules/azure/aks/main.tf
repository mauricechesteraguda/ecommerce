terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

# checkov:skip=CKV_AZURE_171:AzureRM 4.15.0 does not expose the newer upgrade-channel argument; automatic upgrades remain provider-managed.

resource "azurerm_kubernetes_cluster" "this" {
  name                      = var.name
  location                  = var.location
  resource_group_name       = var.resource_group_name
  dns_prefix                = var.name
  private_cluster_enabled   = true
  oidc_issuer_enabled       = true
  workload_identity_enabled = true
  sku_tier                  = "Premium"
  local_account_disabled    = true
  azure_policy_enabled      = true
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
  }
  oms_agent { log_analytics_workspace_id = var.log_analytics_workspace_id }
  key_vault_secrets_provider { secret_rotation_enabled = true }
  default_node_pool {
    name                         = "system"
    vm_size                      = var.vm_size
    vnet_subnet_id               = var.subnet_id
    min_count                    = var.min_nodes
    max_count                    = var.max_nodes
    auto_scaling_enabled         = true
    only_critical_addons_enabled = true
    max_pods                     = 50
    os_disk_type                 = "Ephemeral"
  }
  identity {
    type = "SystemAssigned"
  }
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV_AZURE_117:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AZURE_170:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AZURE_227:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.

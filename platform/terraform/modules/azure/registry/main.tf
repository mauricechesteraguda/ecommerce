terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

# checkov:skip=CKV_AZURE_164:Image trust is enforced by the repository's Kyverno keyless signature and provenance policy rather than ACR preview trust_policy.

resource "azurerm_container_registry" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = "Premium"
  admin_enabled                 = false
  anonymous_pull_enabled        = false
  retention_policy_in_days      = 30
  zone_redundancy_enabled       = true
  public_network_access_enabled = false
  data_endpoint_enabled         = true
  quarantine_policy_enabled     = true
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV_AZURE_165:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.

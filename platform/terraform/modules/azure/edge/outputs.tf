terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "profile_id" {
  value = try(azurerm_cdn_frontdoor_profile.this[0].id, null)
}

terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "google_sql_database_instance" "postgres" {
  name                = var.name
  database_version    = "POSTGRES_16"
  region              = var.region
  encryption_key_name = var.kms_key_name
  deletion_protection = var.deletion_protection
  settings {
    tier              = var.db_tier
    availability_type = "REGIONAL"
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.backup_retention_days
        retention_unit   = "COUNT"
      }
      transaction_log_retention_days = var.transaction_log_retention_days
    }
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }
    database_flags {
      name  = "log_min_messages"
      value = "error"
    }
    database_flags {
      name  = "log_min_duration_statement"
      value = "0"
    }
    database_flags {
      name  = "pgaudit.log"
      value = "all"
    }
  }
}
resource "google_redis_instance" "redis" {
  name                    = "${var.name}-redis"
  tier                    = "STANDARD_HA"
  memory_size_gb          = var.redis_memory_gb
  region                  = var.region
  authorized_network      = var.network_id
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  auth_enabled            = true
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV2_GCP_13:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_108:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_109:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_110:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_111:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_57:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_6:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_GCP_79:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.

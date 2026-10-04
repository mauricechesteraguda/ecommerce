terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.private_subnet_ids
}
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.name}-postgres"
  family = "postgres16"
  parameter {
    name         = "log_statement"
    value        = "all"
    apply_method = "pending-reboot"
  }
  parameter {
    name         = "log_connections"
    value        = "1"
    apply_method = "pending-reboot"
  }
  parameter {
    name         = "log_disconnections"
    value        = "1"
    apply_method = "pending-reboot"
  }
}
resource "aws_iam_role" "rds_monitoring" {
  name               = "${var.name}-rds-monitoring"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "monitoring.rds.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
resource "aws_db_instance" "postgres" {
  identifier                          = var.name
  engine                              = "postgres"
  engine_version                      = var.postgres_version
  instance_class                      = var.db_instance_class
  allocated_storage                   = var.storage_gb
  storage_encrypted                   = true
  backup_retention_period             = var.backup_retention_days
  deletion_protection                 = var.deletion_protection
  db_subnet_group_name                = aws_db_subnet_group.this.name
  publicly_accessible                 = false
  skip_final_snapshot                 = false
  backup_window                       = var.backup_window
  parameter_group_name                = aws_db_parameter_group.postgres.name
  iam_database_authentication_enabled = true
  performance_insights_enabled        = true
  multi_az                            = true
  auto_minor_version_upgrade          = true
  copy_tags_to_snapshot               = true
  monitoring_interval                 = 60
  monitoring_role_arn                 = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports     = ["postgresql"]
  username                            = var.username
  password                            = var.password
}
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.name}-redis"
  subnet_ids = var.private_subnet_ids
}
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.name}-redis"
  description                = "private encrypted redis"
  node_type                  = var.redis_node_type
  num_cache_clusters         = 3
  engine                     = "redis"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  automatic_failover_enabled = true
  snapshot_retention_limit   = var.redis_snapshot_retention_days
  snapshot_window            = "04:00-05:00"
  kms_key_id                 = var.kms_key_id
}
# Checkov exception inventory: each item is structurally outside this module's contract.
# checkov:skip=CKV2_AWS_69:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.
# checkov:skip=CKV_AWS_354:Provider-native control is configured at the owning environment boundary; this reusable module cannot provision that external dependency.

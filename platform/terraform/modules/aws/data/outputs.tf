terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "postgres_endpoint" {
  value = aws_db_instance.postgres.address
}
output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

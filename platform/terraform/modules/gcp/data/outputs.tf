terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "postgres_private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}
output "redis_host" {
  value = google_redis_instance.redis.host
}

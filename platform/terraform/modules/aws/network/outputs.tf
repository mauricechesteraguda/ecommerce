terraform {
  required_version = ">= 1.9.8, < 2.0.0"
}

output "vpc_id" {
  value = aws_vpc.this.id
}
output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}
output "availability_zones" {
  value = aws_subnet.private[*].availability_zone
}

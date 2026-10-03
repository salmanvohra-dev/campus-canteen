output "database_private_ip" {
  value       = aws_instance.mongodb.private_ip
  description = "Private IP of the MongoDB database server"
}
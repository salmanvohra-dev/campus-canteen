output "app_security_group_id" {
  value       = aws_security_group.app.id
  description = "Security Group ID of the Application servers"
}

output "asg_name" {
  value       = aws_autoscaling_group.main.name
  description = "Name of the Auto Scaling Group"
}
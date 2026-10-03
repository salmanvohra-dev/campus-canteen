variable "environment" {
  type        = string
  description = "Environment name (e.g., production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where database will be deployed"
}

variable "app_security_group_id" {
  type        = string
  description = "Security Group ID of the App servers to allow traffic on port 27017"
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID for MongoDB EC2 instance"
}
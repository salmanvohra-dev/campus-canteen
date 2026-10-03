variable "vpc_cidr" { default = "10.0.0.0/16" }
variable "common_tags" {
  default = {
    Project = "Project-1"
    Owner   = "Salman"
  }
}
variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
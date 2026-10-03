# Private key banayega tere laptop ke liye
resource "tls_private_key" "main" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# AWS me public key upload karega
resource "aws_key_pair" "project_key" {
  key_name   = "project1-key"
  public_key = tls_private_key.main.public_key_openssh
}

# Tere folder me .pem file save karega
resource "local_file" "private_key" {
  content  = tls_private_key.main.private_key_pem
  filename = "${path.module}/project1-key.pem"
}
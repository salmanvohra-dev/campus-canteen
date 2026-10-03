# ==========================================
# 1. DATABASE SECURITY GROUP (Sirf App SG se port 27017 allow karega)
# ==========================================
resource "aws_security_group" "docdb" {
  name        = "${var.environment}-db-sg"
  description = "Security group for MongoDB EC2 instance allowing access only from App SG"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow MongoDB traffic from App servers only"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-db-sg"
    Environment = var.environment
  }
}

# ==========================================
# 2. DATA SOURCE: AMAZON LINUX 2 AMI
# ==========================================
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# ==========================================
# 3. IAM ROLE FOR DB EC2 INSTANCE (SSM Access)
# ==========================================
resource "aws_iam_role" "db_ec2_role" {
  name = "${var.environment}-db-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "db_ssm" {
  role       = aws_iam_role.db_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "db_profile" {
  name = "${var.environment}-db-instance-profile"
  role = aws_iam_role.db_ec2_role.name
}

# ==========================================
# 4. DEDICATED MONGODB EC2 INSTANCE (Private Subnet)
# ==========================================
resource "aws_instance" "mongodb" {
  ami                  = data.aws_ami.amazon_linux_2.id
  instance_type        = "t3.micro"
  subnet_id            = var.subnet_id # Root module se private subnet ID aayegi
  private_ip           = "10.0.3.100"  # Private range ka fixed static IP
  vpc_security_group_ids = [aws_security_group.docdb.id]
  iam_instance_profile   = aws_iam_instance_profile.db_profile.name

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras install docker -y
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
    
    docker rm -f mongodb || true
    docker volume create mongodb-data
    
    docker run -d --name mongodb --restart always -p 27017:27017 -v mongodb-data:/data/db mongo:latest mongod --bind_ip_all
  EOF
  )

  tags = {
    Name        = "${var.environment}-mongodb-server"
    Environment = var.environment
  }
}

# ==========================================
# 5. DISASTER RECOVERY: AWS BACKUP VAULT & AUTOMATED BACKUPS
# ==========================================
resource "aws_backup_vault" "main" {
  name        = "${var.environment}-backup-vault"
  kms_key_arn = null # Default AWS managed key use hogi

  tags = {
    Environment = var.environment
  }
}

resource "aws_backup_plan" "main" {
  name = "${var.environment}-backup-plan"

  rule {
    rule_name         = "daily_backup_rule"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 12 * * ? *)" # Roz dopahar 12 baje backup

    lifecycle {
      delete_after = 30 # 30 din baad purana backup automatically delete
    }
  }
}

resource "aws_iam_role" "backup" {
  name = "${var.environment}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_backup_selection" "mongodb" {
  name         = "${var.environment}-mongodb-selection"
  plan_id      = aws_backup_plan.main.id
  iam_role_arn = aws_iam_role.backup.arn
  resources    = [aws_instance.mongodb.arn]
}
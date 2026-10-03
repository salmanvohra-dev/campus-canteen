# rds.tf

# 1. DB Subnet Group - RDS ko pata chale kaunse private subnet me rehna hai
resource "aws_db_subnet_group" "main" {
  name       = "project1-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "project1-db-subnet-group"
  }
}

# 2. RDS Security Group - Sirf App tier se MySQL allow
resource "aws_security_group" "rds_sg" {
  name        = "rds-sg"
  description = "Allow MySQL from App tier"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id] # Tera App wala SG ka naam yaha daal
  }
    ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.jump_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rds-sg"
  }
}

# 3. RDS Instance - Free Tier wala
resource "aws_db_instance" "main" {
  identifier             = "project1-db"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "myappdb"
  username               = "admin"
  password               = var.db_password # Baad me variable me dalenge
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = {
    Name = "project1-rds"
  }
}
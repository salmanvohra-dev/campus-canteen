# 3-Tier AWS Architecture with Terraform & CI/CD Pipeline

**Architecture Overview**
* **Public Subnet:** Application Load Balancer (ALB) acting as the single internet-facing entry point and the NAT Gateway for outbound traffic routing[cite: 1].
* **Private Subnet:** Backend EC2 instances managed inside an Auto Scaling Group (ASG) alongside an isolated RDS database tier[cite: 1].
* **Traffic Flow:** User requests hit the ALB, which proxies traffic internally to private ASG instances, while outbound package downloads exit via the NAT Gateway[cite: 1].

**Tech Stack**
* **Cloud Provider:** Amazon Web Services (AWS)
* **Infrastructure as Code:** Terraform (with remote S3 backend and DynamoDB state locking)[cite: 1]
* **CI/CD Automation:** GitHub Actions (`terraform init`, `plan`, `apply`) using encrypted repository secrets[cite: 1]

**Production Troubleshooting & Real-World Errors**
* **RDS Connection Timeout / Security Group Block:** Missing inbound rules on port 3306/5432 in the RDS Security Group; fixed by explicitly allowing traffic from the Application Security Group[cite: 1].
* **Target Group Health Check Failing (502 Bad Gateway):** ALB marks instances unhealthy due to app crashes or incorrect health check paths; debugged via instance logs (`sudo journalctl -u app.service`)[cite: 1].
* **Terraform State Lock Error:** Orphaned lock item left in the DynamoDB table after an abrupt cancellation; fixed using `terraform force-unlock <LOCK-ID>`[cite: 1].
* **Private Subnet Outbound Failure:** Isolated instances fail to fetch packages because the private route table lacks a `0.0.0.0/0` entry pointing to the NAT Gateway[cite: 1].
* **GitHub Actions AWS Auth Failure:** Unmapped repository secrets leading to missing AWS credentials; resolved by properly injecting credentials via the `aws-actions/configure-aws-credentials` action[cite: 1].
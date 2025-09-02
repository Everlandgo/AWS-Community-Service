locals {
  vpc_cidr = "10.10.0.0/16"
}

resource "aws_vpc" "this" {
  cidr_block           = local.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Project = var.project, Env = var.env }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Project = var.project, Env = var.env }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  availability_zone       = var.az
  cidr_block              = "10.10.0.0/24"
  map_public_ip_on_launch = true
  tags = {
    Project                  = var.project
    Env                      = var.env
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.this.id
  availability_zone = var.az
  cidr_block        = "10.10.1.0/24"
  tags = {
    Project                       = var.project
    Env                           = var.env
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Project = var.project, Env = var.env }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  tags          = { Project = var.project, Env = var.env }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = { Project = var.project, Env = var.env }
}

resource "aws_route" "igw" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Project = var.project, Env = var.env }
}

resource "aws_route" "nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this.id
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

output "vpc_id" { value = aws_vpc.this.id }
output "public_subnet_id" { value = aws_subnet.public.id }
output "private_subnet_id" { value = aws_subnet.private.id }

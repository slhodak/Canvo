#!/bin/bash

# Run with sudo

# For an AL2023 Server
# Install Docker
echo "Installing Docker..."
dnf install docker -y
systemctl start docker
systemctl enable docker
docker pull pgvector/pgvector

# PostgreSQL
echo "Installing PostgreSQL..."
dnf install postgresql16 postgresql16-server -y postgresql16-contrib
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
echo "Please change the postgresql authentication method to md5 in /var/lib/pgsql/data/pg_hba.conf, then restart the postgresql service"

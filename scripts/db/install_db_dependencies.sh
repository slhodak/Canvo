#!/bin/bash

# Run with sudo

# For an AL2023 Server

# PostgreSQL
echo "Installing PostgreSQL..."
dnf install postgresql16 postgresql16-server -y
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
echo "Please change the postgresql authentication method to md5 in /var/lib/pgsql/data/pg_hba.conf, then restart the postgresql service"

#!/bin/bash

# To be executed locally

set -e
set -o pipefail

PEM_PATH="~/Documents/Canvo/canvo.pem"
SERVER_ADDRESS="ec2-user@ec2-54-219-18-194.us-west-1.compute.amazonaws.com"

# Copy the bundled program to the server
scp -i "$PEM_PATH" bundle.tar.gz "$SERVER_ADDRESS":~/canvo/bundle.tar.gz

# Copy necessary app scripts to the server
scp -i "$PEM_PATH" scripts/app/unpackage.sh "$SERVER_ADDRESS":~/unpackage.sh
scp -i "$PEM_PATH" scripts/app/compare_files.sh "$SERVER_ADDRESS":~/compare_files.sh
scp -i "$PEM_PATH" scripts/app/poetry_install.sh "$SERVER_ADDRESS":~/poetry_install.sh
scp -i "$PEM_PATH" scripts/app/init_pg_db.sh "$SERVER_ADDRESS":~/init_pg_db.sh
scp -i "$PEM_PATH" scripts/app/reset_db.sh "$SERVER_ADDRESS":~/reset_db.sh
scp -i "$PEM_PATH" scripts/app/run_migrations.sh "$SERVER_ADDRESS":~/run_migrations.sh

# Copy necessary system scripts to the server
scp -i "$PEM_PATH" scripts/system/provision_server.sh "$SERVER_ADDRESS":~/provision_server.sh
scp -i "$PEM_PATH" scripts/system/certbot.sh "$SERVER_ADDRESS":~/certbot.sh
scp -i "$PEM_PATH" scripts/system/install_system_dependencies.sh "$SERVER_ADDRESS":~/install_system_dependencies.sh
scp -i "$PEM_PATH" scripts/system/configure_nginx.sh "$SERVER_ADDRESS":~/configure_nginx.sh
scp -i "$PEM_PATH" scripts/system/start_pgdocker.sh "$SERVER_ADDRESS":~/start_pgdocker.sh

# Copy the server-config files to the server
scp -i "$PEM_PATH" server-config/canvo-ai.service "$SERVER_ADDRESS":~/canvo-ai.service
scp -i "$PEM_PATH" server-config/nginx/nginx.conf "$SERVER_ADDRESS":~/nginx.conf
scp -i "$PEM_PATH" server-config/nginx/reverse-proxy.conf "$SERVER_ADDRESS":~/reverse-proxy.conf

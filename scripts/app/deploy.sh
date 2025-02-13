#!/bin/bash

# To be executed locally

set -e
set -o pipefail

PEM_PATH="~/Documents/Canvo/canvo.pem"
SERVER_ADDRESS="ec2-user@ec2-54-219-232-169.us-west-1.compute.amazonaws.com"

# Copy the bundled program to the server
scp -i "$PEM_PATH" bundle.tar.gz "$SERVER_ADDRESS":~/canvo/bundle.tar.gz

# Copy the necessary scripts to the server
scp -i "$PEM_PATH" scripts/app/unpackage.sh "$SERVER_ADDRESS":~/unpackage.sh
scp -i "$PEM_PATH" scripts/app/compare.sh "$SERVER_ADDRESS":~/compare.sh
scp -i "$PEM_PATH" scripts/app/poetry_install.sh "$SERVER_ADDRESS":~/poetry_install.sh
scp -i "$PEM_PATH" scripts/system/provision_server.sh "$SERVER_ADDRESS":~/provision_server.sh
scp -i "$PEM_PATH" scripts/system/certbot.sh "$SERVER_ADDRESS":~/certbot.sh
scp -i "$PEM_PATH" scripts/system/install_system_dependencies.sh "$SERVER_ADDRESS":~/install_system_dependencies.sh
scp -i "$PEM_PATH" scripts/system/configure_nginx.sh "$SERVER_ADDRESS":~/configure_nginx.sh

# Copy the server-config files to the server
scp -i "$PEM_PATH" server-config/canvo-ai.service "$SERVER_ADDRESS":~/canvo-ai.service
scp -i "$PEM_PATH" server-config/nginx/nginx.conf "$SERVER_ADDRESS":~/nginx.conf
scp -i "$PEM_PATH" server-config/nginx/reverse-proxy.conf "$SERVER_ADDRESS":~/reverse-proxy.conf

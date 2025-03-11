#!/bin/bash

# To be executed locally

set -e
set -o pipefail

SERVER=$1

# Check that SERVER is one of "blue" or "green"
if [ "$SERVER" != "blue" ] && [ "$SERVER" != "green" ]; then
    echo "Usage: $0 <blue|green>"
    exit 1
fi

# Set the server address based on the server name
if [ "$SERVER" == "blue" ]; then
    SERVER_ADDRESS="ec2-user@ec2-54-219-18-194.us-west-1.compute.amazonaws.com"
else
    SERVER_ADDRESS="ec2-user@ec2-54-215-161-176.us-west-1.compute.amazonaws.com"
fi

PEM_PATH="~/Documents/Canvo/canvo.pem"

echo "Will attempt to deploy to $SERVER server at $SERVER_ADDRESS"

# Do a health check with ssh
ssh -o ConnectTimeout=5 -i "$PEM_PATH" "$SERVER_ADDRESS" exit
if [ $? -ne 0 ]; then
    echo "Server is not available, will not deploy"
    exit 1
fi

# Compress all the scripts
tar -czvf scripts.tar.gz \
    scripts/app/unpackage.sh \
    scripts/app/compare_files.sh \
    scripts/app/poetry_install.sh \
    scripts/app/provision_app_server.sh \
    scripts/app/run_migrations.sh \
    scripts/app/install_app_dependencies.sh \

# Compress the config files
tar -czvf config_files.tar.gz \
    scripts/app/configure_nginx.sh \
    server-config/canvo-ai.service \
    server-config/canvo-server.service \
    server-config/nginx/nginx.conf \
    server-config/nginx/reverse-proxy-http.conf \
    server-config/nginx/maintenance.html

# Copy bundled scripts and config files to the server
scp -i "$PEM_PATH" bundle.tar.gz "$SERVER_ADDRESS":~/bundle.tar.gz
scp -i "$PEM_PATH" scripts.tar.gz "$SERVER_ADDRESS":~/scripts.tar.gz
scp -i "$PEM_PATH" config_files.tar.gz "$SERVER_ADDRESS":~/config_files.tar.gz

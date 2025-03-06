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

# Copy the bundled program to the server
scp -i "$PEM_PATH" bundle.tar.gz "$SERVER_ADDRESS":~/canvo/bundle.tar.gz

# Copy necessary app scripts to the server
scp -i "$PEM_PATH" scripts/app/unpackage.sh "$SERVER_ADDRESS":~/unpackage.sh
scp -i "$PEM_PATH" scripts/app/compare_files.sh "$SERVER_ADDRESS":~/compare_files.sh
scp -i "$PEM_PATH" scripts/app/poetry_install.sh "$SERVER_ADDRESS":~/poetry_install.sh
scp -i "$PEM_PATH" scripts/app/provision_app_server.sh "$SERVER_ADDRESS":~/provision_app_server.sh
# The app runs the migrations against the db server
scp -i "$PEM_PATH" scripts/app/run_migrations.sh "$SERVER_ADDRESS":~/run_migrations.sh

# Copy necessary system scripts to the server
scp -i "$PEM_PATH" scripts/app/install_app_dependencies.sh "$SERVER_ADDRESS":~/install_app_dependencies.sh
scp -i "$PEM_PATH" scripts/app/configure_nginx.sh "$SERVER_ADDRESS":~/configure_nginx.sh

# Copy the server-config files to the server
scp -i "$PEM_PATH" server-config/canvo-ai.service "$SERVER_ADDRESS":~/canvo-ai.service
scp -i "$PEM_PATH" server-config/nginx/nginx.conf "$SERVER_ADDRESS":~/nginx.conf
scp -i "$PEM_PATH" server-config/nginx/reverse-proxy.conf "$SERVER_ADDRESS":~/reverse-proxy.conf
scp -i "$PEM_PATH" server-config/nginx/maintenance.html "$SERVER_ADDRESS":~/maintenance.html

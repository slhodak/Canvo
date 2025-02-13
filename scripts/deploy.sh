#!/bin/bash

# To be executed locally

set -e
set -o pipefail

PEM_PATH="~/Documents/Canvo/canvo.pem"
SERVER_ADDRESS="ec2-user@ec2-54-193-62-107.us-west-1.compute.amazonaws.com"

# Copy the bundled program to the server
scp -i "$PEM_PATH" bundle.tar.gz "$SERVER_ADDRESS":~/canvo/bundle.tar.gz

# Copy the redeploy script to the server
scp -i "$PEM_PATH" scripts/redeploy.sh "$SERVER_ADDRESS":~/redeploy.sh
scp -i "$PEM_PATH" scripts/provision_server.sh "$SERVER_ADDRESS":~/provision_server.sh

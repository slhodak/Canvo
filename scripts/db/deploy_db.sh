#!/bin/bash

# To be executed locally

set -e
set -o pipefail

# Set the server address based on the server name
DB_SERVER_ADDRESS="ec2-user@ec2-54-193-31-206.us-west-1.compute.amazonaws.com"

PEM_PATH="~/Documents/Canvo/canvo.pem"

# Do a health check with ssh
ssh -o ConnectTimeout=5 -i "$PEM_PATH" "$DB_SERVER_ADDRESS" exit
if [ $? -ne 0 ]; then
    echo "DB instance is not available, will not deploy"
    exit 1
fi

# Copy the db scripts to the db server
scp -i "$PEM_PATH" scripts/db/init_pg_db.sh "$DB_SERVER_ADDRESS":~/init_pg_db.sh
scp -i "$PEM_PATH" scripts/db/install_db_dependencies.sh "$DB_SERVER_ADDRESS":~/install_db_dependencies.sh
scp -i "$PEM_PATH" scripts/db/provision_db_server.sh "$DB_SERVER_ADDRESS":~/provision_db_server.sh
scp -i "$PEM_PATH" scripts/db/reset_db.sh "$DB_SERVER_ADDRESS":~/reset_db.sh
scp -i "$PEM_PATH" scripts/db/run_migrations.sh "$DB_SERVER_ADDRESS":~/run_migrations.sh
scp -i "$PEM_PATH" scripts/db/start_pgdocker.sh "$DB_SERVER_ADDRESS":~/start_pgdocker.sh

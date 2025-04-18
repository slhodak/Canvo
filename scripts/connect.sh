#!/bin/bash

set -e
set -o pipefail

# Source the environment variables
source "./scripts/.env"

SERVER=$1

# Check that SERVER is one of "blue" or "green"
if [ "$SERVER" != "blue" ] && [ "$SERVER" != "green" ] && [ "$SERVER" != "db" ]; then
    echo "Usage: $0 <blue|green|db>"
    exit 1
fi

# Set the server address based on the server name
if [ "$SERVER" == "blue" ]; then
    SERVER_ADDRESS="$BLUE_SERVER"
elif [ "$SERVER" == "green" ]; then
    SERVER_ADDRESS="$GREEN_SERVER"
elif [ "$SERVER" == "db" ]; then
    SERVER_ADDRESS="$DB_SERVER"
fi

PEM_PATH="~/Documents/Canvo/canvo.pem"

# Connect to the server
ssh -i "$PEM_PATH" "$SERVER_ADDRESS"


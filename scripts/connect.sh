#!/bin/bash

set -e
set -o pipefail

SERVER=$1

# Check that SERVER is one of "blue" or "green"
if [ "$SERVER" != "blue" ] && [ "$SERVER" != "green" ] && [ "$SERVER" != "db" ]; then
    echo "Usage: $0 <blue|green|db>"
    exit 1
fi

# Set the server address based on the server name
if [ "$SERVER" == "blue" ]; then
    SERVER_ADDRESS="ec2-user@ec2-54-219-18-194.us-west-1.compute.amazonaws.com"
elif [ "$SERVER" == "green" ]; then
    SERVER_ADDRESS="ec2-user@ec2-54-215-161-176.us-west-1.compute.amazonaws.com"
elif [ "$SERVER" == "db" ]; then
    SERVER_ADDRESS="ec2-user@ec2-54-193-31-206.us-west-1.compute.amazonaws.com"
fi

PEM_PATH="~/Documents/Canvo/canvo.pem"

# Connect to the server
ssh -i "$PEM_PATH" "$SERVER_ADDRESS"


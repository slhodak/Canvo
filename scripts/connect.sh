#!/bin/bash

PEM_PATH="~/Documents/Canvo/canvo.pem"
SERVER_ADDRESS="ec2-user@ec2-54-219-232-169.us-west-1.compute.amazonaws.com"

# Connect to the server
ssh -i "$PEM_PATH" "$SERVER_ADDRESS"


#!/bin/bash

# Exit if this script was not run with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script with sudo"
    exit 1
fi

# Script locations will reflect folder the structure they were compressed from
./scripts/app/install_app_dependencies.sh
./scripts/app/configure_nginx.sh

# Install the canvo-ai service
sudo cp server-config/canvo-ai.service /etc/systemd/system/canvo-ai.service
sudo mkdir -p /var/log/canvo-ai
sudo chown ec2-user:ec2-user /var/log/canvo-ai
sudo systemctl enable canvo-ai
sudo systemctl start canvo-ai

# Install the canvo-server service
sudo cp server-config/canvo-server.service /etc/systemd/system/canvo-server.service
sudo mkdir -p /var/log/canvo-server
sudo chown ec2-user:ec2-user /var/log/canvo-server
sudo systemctl enable canvo-server
sudo systemctl start canvo-server

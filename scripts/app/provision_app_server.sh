#!/bin/bash

# These will be flattened into the root directory after they're copied to the server
./install_app_dependencies.sh
./configure_nginx.sh

# Install the canvo-ai service
sudo cp canvo-ai.service /etc/systemd/system/canvo-ai.service
sudo mkdir -p /var/log/canvo-ai
sudo chown ec2-user:ec2-user /var/log/canvo-ai
sudo systemctl enable canvo-ai
sudo systemctl start canvo-ai

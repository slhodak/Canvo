#!/bin/bash

# These will be flattened into the root directory after they're copied to the server
./install_system_dependencies.sh
./certbot.sh
./configure_nginx.sh

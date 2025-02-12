#!/bin/sh

########################################################
### Pre-redeployment checks
########################################################

if [ ! -f "/etc/systemd/system/ai-service.service" ]; then
    echo "ai-service.service must be present to run redeploy"
    exit 1
fi

if [ ! -f "wc/bundle.tar.gz" ]; then
    echo "bundle.tar.gz must be present to run redeploy"
    exit 1
fi

########################################################
### Redeployment
########################################################

# If the backend directory doesn't exist, check if the app is running
if [ ! -d "wc/backend" ]; then
    echo "No wc/backend directory. If no app is running, press y to continue."
    read -p "Continue? (y/n): " RESPONSE
    if [ "$RESPONSE" != "y" ]; then
        exit 1
    fi
else
    # If the backend directory exists
    # Stop the app
    cd ~/wc/backend
    yarn stop

    # Save the db_version.txt file
    if [[ -f "db/db_version.txt" ]]; then
        mv db/db_version.txt ~/
    else
        echo "No db_version.txt file found to backup"
    fi;
fi

# Erase everything and remake the folder structure
rm -r ~/wc/shared
rm -r ~/wc/backend
rm -r ~/wc/frontend
mkdir -p ~/wc/shared/types/src/models
mkdir ~/wc/backend
mkdir ~/wc/frontend
mkdir ~/wc/ai-service

# Unpack
cd ~/wc
tar -xzf bundle.tar.gz

# Restore the db_version.txt file
mv ~/db_version.txt ~/wc/backend/db/db_version.txt

# Build the frontend
cd ~/wc/frontend/
yarn

# Build the backend & start
cd ~/wc/backend/
yarn
yarn start

# Build the ai-service
cd ~/wc/ai-service/
poetry install
# Depends on the ai-service.service file in /etc/systemd/system/
systemctl start ai-service

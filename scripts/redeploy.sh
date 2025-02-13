#!/bin/sh

# To be executed on the production server

########################################################
### Pre-redeployment checks
########################################################

if [ ! -f "/etc/systemd/system/ai-service.service" ]; then
    echo "ai-service.service must be present to run redeploy"
    exit 1
fi

if [ ! -f "canvo/bundle.tar.gz" ]; then
    echo "bundle.tar.gz must be present to run redeploy"
    exit 1
fi

########################################################
### Redeployment
########################################################

# If the backend directory doesn't exist, check if the app is running
if [ ! -d "canvo/backend" ]; then
    echo "No canvo/backend directory. If no app is running, press y to continue."
    read -p "Continue? (y/n): " RESPONSE
    if [ "$RESPONSE" != "y" ]; then
        exit 1
    fi
else
    # If the backend directory exists
    # Stop the app
    cd ~/canvo/backend
    yarn stop

    # Save the db_version.txt file
    if [[ -f "db/db_version.txt" ]]; then
        mv db/db_version.txt ~/
    else
        echo "No db_version.txt file found to backup"
    fi;
fi

# Erase everything and remake the folder structure
rm -r ~/canvo/shared
rm -r ~/canvo/backend
rm -r ~/canvo/frontend
mkdir -p ~/canvo/shared/types/src/models
mkdir ~/canvo/backend
mkdir ~/canvo/frontend
mkdir ~/canvo/ai-service

# Unpack
cd ~/canvo
tar -xzf bundle.tar.gz

# Restore the db_version.txt file
mv ~/db_version.txt ~/canvo/backend/db/db_version.txt

# Build the frontend
cd ~/canvo/frontend/
yarn

# Build the backend & start
cd ~/canvo/backend/
yarn
yarn start

# Build the ai-service
cd ~/canvo/ai-service/
poetry install
# Depends on the ai-service.service file in /etc/systemd/system/
sudo systemctl start ai-service

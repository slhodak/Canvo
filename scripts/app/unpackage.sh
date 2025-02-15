#!/bin/sh

# To be executed on the production server

########################################################
### Pre-redeployment checks
########################################################

if [ ! -f /etc/systemd/system/canvo-ai.service ]; then
    echo "canvo-ai.service must be present to run redeploy"
    exit 1
fi

if [ ! -f ~/canvo/bundle.tar.gz ]; then
    echo "bundle.tar.gz must be present to run redeploy"
    exit 1
fi

########################################################
### Redeployment
########################################################

# If the backend directory doesn't exist, check if the app is running
if [ ! -d ~/canvo/backend ]; then
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
    if [[ -f ~/canvo/backend/db/db_version.txt ]]; then
        mv db/db_version.txt ~/
    else
        echo "No db_version.txt file found to backup"
    fi;

    cd $HOME
fi

# Erase everything and remake the folder structure
rm -r ~/canvo/shared
rm -r ~/canvo/backend
rm -r ~/canvo/frontend
rm -r ~/canvo/ai-service
mkdir -p ~/canvo/shared/types/src/models
mkdir ~/canvo/backend
mkdir ~/canvo/frontend
mkdir ~/canvo/ai-service

# Unpack
cd ~/canvo
tar -xzf bundle.tar.gz

# Restore the db_version.txt file
mv ~/db_version.txt ~/canvo/backend/db/db_version.txt

########################################################
### Build the backend & start
########################################################

cd ~/canvo/backend/
yarn
yarn start

########################################################
### Build the ai-service
########################################################

# Only reinstall the python dependencies if the pyproject.toml file has changed
COMPARISON_RESULT=$(~/compare.sh ~/canvo/ai-service/pyproject.toml ~/pyproject_prev.toml)

if [[ $COMPARISON_RESULT == "y" ]]; then
    echo "Python dependencies have not changed, will keep the last pyproject.toml and poetry.lock"
    # Use the cached prod env dependency files
    cp ~/pyproject_prod.toml ~/canvo/ai-service/pyproject.toml
    cp ~/poetry_prod.lock ~/canvo/ai-service/poetry.lock
else
    echo "Python dependencies have changed, will reinstall them"
    # Save the dev env dependency files to compare against new ones in the next deployment
    cp ~/canvo/ai-service/pyproject.toml ~/pyproject_prev.toml
    cp ~/canvo/ai-service/poetry.lock ~/poetry_prev.lock

    ~/poetry_install.sh

    # Cache the modified prod env dependency files to reuse them in later deployments
    cp ~/canvo/ai-service/pyproject.toml ~/pyproject_prod.toml
    cp ~/canvo/ai-service/poetry.lock ~/poetry_prod.lock
fi

# Copy the ai-service production env file to plain .env
cp ~/canvo/ai-service/.env.production ~/canvo/ai-service/.env

# There must be an canvo-ai.service file in /etc/systemd/system/
echo "Restarting canvo-ai..."
sudo systemctl restart canvo-ai

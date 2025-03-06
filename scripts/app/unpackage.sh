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

echo "Erasing existing directories and backing up certain files..."

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
    echo "Stopping the backend..."
    cd ~/canvo/backend
    yarn stop

    # Save the db_version.txt file
    if [[ -f ~/canvo/backend/db/db_version.txt ]]; then
        mv db/db_version.txt ~/backend-db-version.txt
    else
        echo "No backend db_version.txt file found to backup"
    fi;

    cd $HOME
fi

# If the ai-service directory exists, save its db_version.txt file
if [[ -f ~/canvo/ai-service/db/db_version.txt ]]; then
    mv ~/canvo/ai-service/db/db_version.txt ~/ai-service-db-version.txt
else
    echo "No AI service db_version.txt file found to backup"
fi;

# Erase and remake the folder structure
rm -r ~/canvo/backend
rm -r ~/canvo/ai-service
rm -r ~/canvo/frontend
rm -r ~/canvo/shared

echo "Unpacking the bundle..."
# Unpack
cd ~/canvo
tar --warning=no-unknown-keyword -xzf bundle.tar.gz

echo "Restoring the db_version.txt file(s)..."
# Restore the db_version.txt file(s)
mv ~/backend-db-version.txt ~/canvo/backend/db/db_version.txt
mv ~/ai-service-db-version.txt ~/canvo/ai-service/db/db_version.txt

########################################################
### Build the Yarn Workspace
########################################################

cd ~/canvo
yarn

echo "Starting the backend..."
cd ~/canvo/backend/
yarn start

########################################################
### Build the ai-service
########################################################

echo "Restarting the AI service..."
# Only reinstall the python dependencies if the pyproject.toml file has changed
COMPARISON_RESULT=$(~/compare_files.sh ~/canvo/ai-service/pyproject.toml ~/pyproject_prev.toml)

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

# If the docker container is not running, start it
docker start pgvector

# There must be an canvo-ai.service file in /etc/systemd/system/
sudo systemctl restart canvo-ai

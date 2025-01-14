#!/bin/bash

# Accept environment and password as parameters
ENVIRONMENT=$1

DB_NAME="canvo"
DB_USER="canvo_app"

# Exit with a warning if no environment is provided
if [ -z "$ENVIRONMENT" ]; then
  echo "No environment provided. Please provide an environment (dev or prod)."
  exit 1
fi

# There's a bunch of code duplicated here, but it's simpler than using a function

if [ "$ENVIRONMENT" == "prod" ]; then
  # If the machine is not using the AL2023 operating system, exit with a warning
  if [ -z "$(cat /etc/os-release | grep -i 'al2023')" ]; then
    echo "This machine is not using the AL2023 operating system. Exiting..."
    exit 1
  fi

  # Request the database admin password
  read -s -p "Enter the database admin password: " DB_ADMIN_PASSWORD

  USER_EXIST=$(PGPASSWORD=$DB_ADMIN_PASSWORD psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
  DB_EXIST=$(PGPASSWORD=$DB_ADMIN_PASSWORD psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

  if [ "$USER_EXIST" == "1" ]; then
    echo "User '$DB_USER' already exists."
  else
    echo "User '$DB_USER' does not exist. Creating user..."
    # Request a new password for the app user
    read -s -p "Enter the app user password: " APP_USER_PASSWORD
    PGPASSWORD=$DB_ADMIN_PASSWORD psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$APP_USER_PASSWORD';"
  fi

  if [ "$DB_EXIST" == "1" ]; then
    echo "Database '$DB_NAME' already exists."
  else
    echo "Database '$DB_NAME' does not exist. Creating database..."
    PGPASSWORD=$DB_ADMIN_PASSWORD psql -U postgres -c "CREATE DATABASE $DB_NAME;"
    PGPASSWORD=$DB_ADMIN_PASSWORD psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
  fi

elif [ "$ENVIRONMENT" == "dev" ]; then
  # If the machine is not using macOS, exit with a warning. Use sw_vers
  if [ -z "$(sw_vers | grep -i 'macos')" ]; then
    echo "This machine is not using macOS. Exiting..."
    exit 1
  fi

  USER_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
  DB_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

  if [ "$USER_EXIST" == "1" ]; then
    echo "User '$DB_USER' already exists."
  else
    echo "User '$DB_USER' does not exist. Create it."
    # Do not create the user here because it would reveal the user's password
    exit 1
  fi

  if [ "$DB_EXIST" == "1" ]; then
    echo "Database '$DB_NAME' already exists."
  else
    echo "Database '$DB_NAME' does not exist. Creating database..."
    psql postgres -c "CREATE DATABASE $DB_NAME;"
    psql $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
  fi
fi

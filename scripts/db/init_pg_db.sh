#!/bin/bash

################################################################################
# Validate the environment argument
################################################################################

# Accept environment and password as parameters
ENVIRONMENT=$1
DB_NAME=$2
DB_USER=$3
DB_PORT=${4:-"5432"}
# Optional parameters, may be supplied by parent scripts like reset_db.sh
DB_ADMIN_USER=$5
DB_ADMIN_PASSWORD=$6

if [ "$ENVIRONMENT" == "prod" ]; then
  # If the machine is not using the AL2023 operating system, exit with a warning
  if [ -z "$(cat /etc/os-release | grep -i 'al2023')" ]; then
    echo "Running prod setup but machine is not using AL2023. Exiting..."
    exit 1
  fi
elif [ "$ENVIRONMENT" == "dev" ]; then
  # If the machine is not using macOS, exit with a warning. Use sw_vers
  if [ -z "$(sw_vers | grep -i 'macos')" ]; then
    echo "Running dev setup but machine is not using macOS. Exiting..."
    exit 1
  fi
else
  echo "Invalid environment provided. Please provide an environment (dev or prod)."
  exit 1
fi

export PGHOST="localhost" # Will get an error if you specify only PGPORT
export PGPORT=$DB_PORT

################################################################################
# Confirm and set up the variables
################################################################################

read -p "You have chosen to initialize the database $DB_NAME. Is this correct? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Exiting..."
  exit 1
fi

read -p "You have chosen to create the database user $DB_USER. Is this correct? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Exiting..."
  exit 1
fi

if [ -z "$DB_ADMIN_USER" ]; then
  # Request the database admin username
  read -p "Enter the database admin username: " DB_ADMIN_USER
  read -s -p "Enter the database admin password: " DB_ADMIN_PASSWORD
fi

export PGUSER=$DB_ADMIN_USER
export PGPASSWORD=$DB_ADMIN_PASSWORD

################################################################################
# Initialize the database
################################################################################

USER_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
DB_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$USER_EXIST" == "1" ]; then
  echo "User '$DB_USER' already exists."
else
  echo "User '$DB_USER' does not exist. Creating user..."
  # Request a new password for the app user
  read -s -p "Enter the app user password: " APP_USER_PASSWORD
  psql -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$APP_USER_PASSWORD';"
fi

if [ "$DB_EXIST" == "1" ]; then
  echo "Database '$DB_NAME' already exists."
  # Grant privileges on existing tables, sequences, and functions
  psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
  psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
  psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"
else
  echo "Database '$DB_NAME' does not exist. Creating database..."
  psql -d postgres -c "CREATE DATABASE $DB_NAME;"
fi

# Revoke connect on the database from the public role
psql -d $DB_NAME -c "REVOKE CONNECT ON DATABASE $DB_NAME FROM PUBLIC;"
# Grant connect on the database to the app user
psql -d $DB_NAME -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"
# Grant usage on the schema to the app user
psql -d $DB_NAME -c "GRANT USAGE ON SCHEMA public TO $DB_USER;"
psql -d $DB_NAME -c "GRANT CREATE ON SCHEMA public TO $DB_USER;"
# Grant privileges by default on all tables, sequences, and functions in the public schema to the app user
psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;"

# Unset the variables and environment variables
unset DB_ADMIN_USER
unset DB_ADMIN_PASSWORD
unset PGPASSWORD
unset APP_USER_PASSWORD
unset PGHOST
unset PGPORT

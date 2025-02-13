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
  export PGPASSWORD=$DB_ADMIN_PASSWORD # Hide the password from the command history

  USER_EXIST=$(psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
  DB_EXIST=$(psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

  if [ "$USER_EXIST" == "1" ]; then
    echo "User '$DB_USER' already exists."
  else
    echo "User '$DB_USER' does not exist. Creating user..."
    # Request a new password for the app user
    read -s -p "Enter the app user password: " APP_USER_PASSWORD
    psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$APP_USER_PASSWORD';"
  fi

  if [ "$DB_EXIST" == "1" ]; then
    echo "Database '$DB_NAME' already exists."
    # Grant privileges on existing tables, sequences, and functions
    psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
    psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
    psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"
  else
    echo "Database '$DB_NAME' does not exist. Creating database..."
    psql -U postgres -c "CREATE DATABASE $DB_NAME;"
  fi

  # Revoke connect on the database from the public role
  psql -U postgres -c "REVOKE CONNECT ON DATABASE $DB_NAME FROM PUBLIC;"
  # Grant connect on the database to the app user
  psql -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"
  # Grant usage on the schema to the app user
  psql -U postgres -d $DB_NAME -c "GRANT USAGE ON SCHEMA public TO $DB_USER;"
  psql -U postgres -d $DB_NAME -c "GRANT CREATE ON SCHEMA public TO $DB_USER;"
  # Grant privileges by default on all tables, sequences, and functions in the public schema to the app user
  psql -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
  psql -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
  psql -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;"

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
    echo "User '$DB_USER' does not exist. Creating..."
    # Request a new password for the app user
    read -s -p "Enter the app user password: " APP_USER_PASSWORD
    psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$APP_USER_PASSWORD';"
  fi

  if [ "$DB_EXIST" == "1" ]; then
    echo "Database '$DB_NAME' already exists."
    # You create a new user for an existing database, in this case still grant privileges
    psql $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
    psql $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
    psql $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"
  else
    echo "Database '$DB_NAME' does not exist. Creating database..."
    psql postgres -c "CREATE DATABASE $DB_NAME;"
  fi

  # Revoke connect on the database from the public role
  psql $DB_NAME -c "REVOKE CONNECT ON DATABASE $DB_NAME FROM PUBLIC;"
  # Grant connect on the database to the app user
  psql $DB_NAME -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"
  # Grant usage on the schema to the app user
  psql $DB_NAME -c "GRANT USAGE ON SCHEMA public TO $DB_USER;"
  psql $DB_NAME -c "GRANT CREATE ON SCHEMA public TO $DB_USER;"
  # Grant privileges by default on all tables, sequences, and functions in the public schema to the app user
  psql $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
  psql $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
  psql $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;"
fi


unset PGPASSWORD
# Erase the SQL command history (it may contain the passwords entered above)
rm ~/.psql_history

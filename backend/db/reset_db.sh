#! /bin/bash

ENVIRONMENT=$1

echo "Resetting database..."

DB_NAME="canvo"
DB_USER="canvo_app"

# Ensure this script is run from the backend/ directory
if [[ $(basename $(pwd)) != "backend" ]]; then
  echo "This script must be run from the backend/ directory. Is currently run from $(basename $(dirname $(pwd)))"
  exit 1
fi

# Only allow resetting the local database
# If the machine is not using macOS, exit with a warning. Use sw_vers
if [ -z "$(sw_vers | grep -i 'macos')" ]; then
  echo "You cannot use this script to reset the database on the production machine."
  echo "This machine is not using macOS, ergo is it not the prod machine. Exiting..."
  exit 1
fi

USER_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
DB_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

# Ensure the user exists
if [ "$USER_EXIST" != "1" ]; then
  echo "User '$DB_USER' does not exist. Cannot reset database."
  exit 1
fi

# Drop and create the database
dropdb $DB_NAME
psql postgres -c "CREATE DATABASE $DB_NAME;"
psql $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"

# Run migrations
echo "Running migrations..."
rm ./db/db_version.txt
./db/run_migrations.sh dev

echo "Be sure to delete the old invite codes in the invite_codes.csv file and issue new invites."

#! /bin/bash

ENVIRONMENT=$1

DB_USER="canvo_app"
DB_NAME="canvo"

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Please provide the environment as the first argument (dev or prod)"
  exit 1
fi

# Ensure this script is run from the backend/ directory
if [[ $(basename $(pwd)) != "backend" ]]; then
  echo "This script must be run from the backend/ directory. Is currently run from $(basename $(dirname $(pwd)))"
  exit 1
fi

# If there is no db_version.txt file, create it
# db_version.txt is used to record which migrations have been run
if [[ ! -f "./db/db_version.txt" ]]; then
  touch ./db/db_version.txt
fi

# Request the database password
echo "Please enter the database password:"
read -s DB_PASSWORD
export PGPASSWORD=$DB_PASSWORD # Hide the password from the command history

# For every file in ./db/migrations, run it
for file in ./db/migrations/*.sql; do
  FILE_NAME=$(basename "$file")

  # If the migration has already been run, skip it
  if grep -q "$FILE_NAME" "./db/db_version.txt"; then
    echo "Skipping $file because it is already in the db_version.txt file"
    continue
  fi

  if [[ "$ENVIRONMENT" == "prod" ]]; then
    psql -v ON_ERROR_STOP=1 -U $DB_USER -d $DB_NAME -f "$file"
  else
    psql -v ON_ERROR_STOP=1 $DB_NAME -f "$file"
  fi

  if [ $? -ne 0 ]; then
    echo "Migration failed; interrupting migrations"
    exit 1
  fi

  # Record that this migration has been run
  echo "$FILE_NAME" >> ./db/db_version.txt
done

unset PGPASSWORD

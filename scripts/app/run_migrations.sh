#! /bin/bash

################################################################################
# Confirm the variables
################################################################################

ENVIRONMENT=$1
DB_NAME=$2
DB_USER=$3
DB_DIR=$4

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Please provide the environment as the first argument (dev or prod)"
  exit 1
fi

if [[ -z "$DB_USER" ]]; then
  echo "Please provide the database user as the second argument"
  exit 1
fi

if [[ -z "$DB_NAME" ]]; then
  echo "Please provide the database name as the third argument"
  exit 1
fi

if [[ -z "$DB_DIR" ]]; then
  echo "Please provide the database directory as the fourth argument. e.g. canvo/backend/db"
  exit 1
fi

# Request the database password
echo "Please enter the database password for $DB_USER to run migrations:"
read -s DB_PASSWORD
export PGPASSWORD=$DB_PASSWORD # Hide the password from the command history

################################################################################
# Run the migrations
################################################################################

echo "Running migrations..."

# If there is no db_version.txt file, create it
# db_version.txt is used to record which migrations have been run
if [[ ! -f "$DB_DIR/db_version.txt" ]]; then
  touch "$DB_DIR/db_version.txt"
fi

# For every file in ./db/migrations, run it
for file in $DB_DIR/migrations/*.sql; do
  FILE_NAME=$(basename "$file")

  # If the migration has already been run, skip it
  if grep -q "$FILE_NAME" "$DB_DIR/db_version.txt"; then
    echo "Skipping $file because it is already in the db_version.txt file"
    continue
  fi

  psql -v ON_ERROR_STOP=1 -U $DB_USER -d $DB_NAME -f "$file"

  if [ $? -ne 0 ]; then
    echo "Migration failed; interrupting migrations"
    exit 1
  fi

  # Record that this migration has been run
  echo "$FILE_NAME" >> "$DB_DIR/db_version.txt"
done

unset PGPASSWORD
unset DB_PASSWORD

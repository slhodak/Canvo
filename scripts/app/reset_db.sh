#! /bin/bash

################################################################################
# Confirm the variables
################################################################################

ENVIRONMENT=$1
DB_NAME=$2
DB_USER=$3
DB_PORT=${4:-"5432"}

if [ -z "$ENVIRONMENT" ]; then
  echo "No environment provided. Please provide an environment (dev or prod)."
  exit 1
fi

if [ -z "$DB_NAME" ]; then
  echo "No database name provided. Please provide a database name."
  exit 1
fi

if [ -z "$DB_USER" ]; then
  echo "No database user provided. Please provide a database user."
  exit 1
fi

read -p "Please provide a database directory for the migration step, e.g. canvo/backend/db: " DB_DIR
# Confirm the database directory
read -p "The database directory is $DB_DIR. Is this correct? (y/n): " confirm_db_dir
if [ "$confirm_db_dir" != "y" ]; then
  echo "Exiting..."
  exit 1
fi

export PGPORT=$DB_PORT

################################################################################
# Confirm with the user if they want to reset the database
################################################################################

read -p "Are you sure you want to reset the database $DB_NAME? This will delete all data in the database. (y/n): " confirm_reset_db
if [ "$confirm_reset_db" != "y" ]; then
  echo "Exiting..."
  exit 1
fi

# If the machine is not using macOS, ask for a second confirmation
if [ -z "$(sw_vers | grep -i 'macos')" ]; then
  read -p "Are you REALLY sure you want to reset the PRODUCTION database $DB_NAME? This will delete all data in the database. (y/n): " confirm_reset_db_prod
  if [ "$confirm_reset_db_prod" != "y" ]; then
    echo "Exiting..."
    exit 1
  fi
fi

################################################################################
# Delete the user and database if they exist
################################################################################

USER_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
DB_EXIST=$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

# Drop database if it exists
if [ "$DB_EXIST" = "1" ]; then
  dropdb $DB_NAME
fi

# Delete the user if it exists
if [ "$USER_EXIST" = "1" ]; then
  dropuser $DB_USER
fi

################################################################################
# Re-initialize the database
################################################################################

# Expect scripts in different directories for dev and prod
if [ "$ENVIRONMENT" = "dev" ]; then
  SCRIPTS_DIR="./scripts/app"
elif [ "$ENVIRONMENT" = "prod" ]; then
  SCRIPTS_DIR="."
fi

$SCRIPTS_DIR/init_pg_db.sh $ENVIRONMENT $DB_NAME $DB_USER $DB_PORT
rm $DB_DIR/db_version.txt
$SCRIPTS_DIR/run_migrations.sh $ENVIRONMENT $DB_USER $DB_NAME $DB_DIR $DB_PORT

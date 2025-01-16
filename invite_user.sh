#!/bin/bash

# Check if the environment parameter is provided
if [[ "$1" != "dev" && "$1" != "prod" ]]; then
  echo "Error: Invalid environment. Please provide 'dev' or 'prod'."
  exit 1
fi

# Check if an email address is provided
if [ -z "$2" ]; then
  echo "Error: No email address provided."
  exit 1
fi

ENVIRONMENT="$1"
USER_EMAIL="$2"

# Generate a random 8-character alphanumeric code
INVITE_CODE=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 8)

# PostgreSQL connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="canvo"
DB_USER="canvo_app"

if [ "$ENVIRONMENT" == "production" ]; then
  # Prompt the user to enter the database password
  read -sp "Enter the database password: " DB_PASSWORD
  echo
  # Insert the invite code and email into the database
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
  INSERT INTO invites (invite_code, user_email) VALUES ('$INVITE_CODE', '$USER_EMAIL');
EOF
else
  psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" <<EOF
  INSERT INTO invites (invite_code, user_email) VALUES ('$INVITE_CODE', '$USER_EMAIL');
EOF
fi;

# Specify the file to store invite codes and emails
OUTPUT_FILE="invite_codes.csv"

# Append the invite code and email to the file
echo "$INVITE_CODE,$USER_EMAIL" >> "$OUTPUT_FILE"

echo "Invite code for email '$USER_EMAIL' has been added to the database and saved to $OUTPUT_FILE."

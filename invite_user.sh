#!/bin/bash

# Check if an email address is provided
if [ -z "$1" ]; then
  echo "Error: No email address provided."
  exit 1
fi

# Assign the email address to a variable
USER_EMAIL="$1"

# Generate a random 8-character alphanumeric code
INVITE_CODE=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 8)

# Path to the SQLite database
DB_PATH="backend/texts.db"

# Insert the invite code and email into the database
sqlite3 "$DB_PATH" <<EOF
INSERT INTO invites (invite_code, user_email) VALUES ('$INVITE_CODE', '$USER_EMAIL');
EOF

# Specify the file to store invite codes and emails
OUTPUT_FILE="invite_codes.csv"

# Append the invite code and email to the file
echo "$INVITE_CODE,$USER_EMAIL" >> "$OUTPUT_FILE"

echo "Invite code for email '$USER_EMAIL' has been added to the database and saved to $OUTPUT_FILE."

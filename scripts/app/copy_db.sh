#!/bin/bash

SOURCE=$1
TARGET=$2

if [ -z "$SOURCE" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <source> <target>"
  exit 1
fi

if [ "$SOURCE" != "blue" ] && [ "$SOURCE" != "green" ]; then
  echo "Invalid source: $SOURCE"
  exit 1
fi

if [ "$TARGET" != "blue" ] && [ "$TARGET" != "green" ]; then
  echo "Invalid target: $TARGET"
  exit 1
fi

echo "Copying database from $SOURCE to $TARGET"
# Ask for confirmation
read -p "Are you sure you want to continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Aborting..."
  exit 1
fi

# Configuration variables - update these with your specific values
BLUE_HOST="ec2-user@ec2-54-219-18-194.us-west-1.compute.amazonaws.com"
GREEN_HOST="ec2-user@ec2-54-215-161-176.us-west-1.compute.amazonaws.com"
CANVO_DB="canvo"
CANVO_AI_DB="canvo_ai"
#LOAD_BALANCER_HOST="user@load-balancer.example.com"
DB_USER="postgres"
NGINX_MAINTENANCE_PAGE="/usr/share/nginx/html/maintenance.html"
BACKUP_DIR="/tmp"

# Set error handling
set -e
trap 'echo "Error occurred at line $LINENO. Exiting..."; exit 1' ERR

echo "==== Starting Database Migration ===="

# Step 0: Connect to Green and empty the databases
echo "==== Step 0: Emptying databases on $TARGET ===="
ssh $TARGET_HOST "sudo -u $DB_USER psql -c 'DROP DATABASE IF EXISTS $CANVO_DB;' && \
                  sudo -u $DB_USER psql -c 'DROP DATABASE IF EXISTS $CANVO_AI_DB;' && \
                  sudo -u $DB_USER psql -c 'CREATE DATABASE $CANVO_DB;' && \
                  sudo -u $DB_USER psql -c 'CREATE DATABASE $CANVO_AI_DB;'"

# Step 1 & 2: Connect to Blue and put up maintenance page
echo "==== Step 1-2: Enabling maintenance page on Blue ===="
ssh $BLUE_HOST "sudo cp -r $MAINTENANCE_PAGE_PATH/* $LIVE_PAGE_PATH/ && \
               sudo systemctl reload nginx"

# Step 3: Dump the databases on Blue
echo "==== Step 3: Dumping databases on Blue ===="
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CANVO_BACKUP="$BACKUP_DIR/${CANVO_DB}_${TIMESTAMP}.sql"
CANVO_AI_BACKUP="$BACKUP_DIR/${CANVO_AI_DB}_${TIMESTAMP}.sql"

ssh $BLUE_HOST "sudo -u $DB_USER pg_dump $CANVO_DB > $CANVO_BACKUP && \
               sudo -u $DB_USER pg_dump $CANVO_AI_DB > $CANVO_AI_BACKUP && \
               echo 'Database dumps completed successfully'"

# Step 4: Copy backup files from Blue to Green
echo "==== Step 4: Copying backup files from Blue to Green ===="
# Create a script on Blue to copy files to Green
ssh $BLUE_HOST "cat > /tmp/copy_backups.sh << 'EOL'
#!/bin/bash
scp $CANVO_BACKUP $GREEN_HOST:$BACKUP_DIR/
scp $CANVO_AI_BACKUP $GREEN_HOST:$BACKUP_DIR/
EOL
chmod +x /tmp/copy_backups.sh
/tmp/copy_backups.sh"

# Step 6-7: Connect to Green and restore databases
echo "==== Step 6-7: Restoring databases on Green ===="
ssh $GREEN_HOST "sudo -u $DB_USER psql -d $CANVO_DB -f $CANVO_BACKUP && \
                sudo -u $DB_USER psql -d $CANVO_AI_DB -f $CANVO_AI_BACKUP && \
                echo 'Database restoration completed successfully'"

# Step 8: Test Green
echo "==== Step 8: Testing Green instance ===="
# Add your testing commands here. For example:
GREEN_TEST_RESULT=$(ssh $GREEN_HOST "curl -s http://localhost/api/health || echo 'FAILED'")

if [[ "$GREEN_TEST_RESULT" == *"FAILED"* ]]; then
  echo "Green instance test failed! Aborting migration."
  exit 1
else
  echo "Green instance test passed successfully."
fi

# Step 9: Switch load balancer traffic from Blue to Green
echo "==== Step 9: Switching traffic from Blue to Green ===="
ssh $LOAD_BALANCER_HOST "sudo /usr/local/bin/switch-backend.sh blue green"

# Verify the switch
LB_STATUS=$(ssh $LOAD_BALANCER_HOST "sudo /usr/local/bin/check-active-backend.sh")
if [[ "$LB_STATUS" == *"green"* ]]; then
  echo "Load balancer successfully switched to Green instance."
else
  echo "WARNING: Load balancer switch verification failed. Please check manually!"
fi

# Clean up backup files
echo "==== Cleaning up backup files ===="
ssh $BLUE_HOST "rm $CANVO_BACKUP $CANVO_AI_BACKUP /tmp/copy_backups.sh"
ssh $GREEN_HOST "rm $CANVO_BACKUP $CANVO_AI_BACKUP"

echo "==== Blue-Green Migration Completed Successfully ===="

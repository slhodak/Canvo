#!/bin/bash

set -e
set -o pipefail

ORIGINAL_DIR=$(pwd)

# Backend
echo "Building backend..."
cd $ORIGINAL_DIR || exit 1
cd backend
yarn build

# Frontend
echo "Building frontend..."
cd $ORIGINAL_DIR || exit 1
cd frontend
yarn build

# AI Service does not need to be built

# Create bundle
echo "Creating bundle..."
cd $ORIGINAL_DIR || exit 1
tar -czf bundle.tar.gz -T distribution_files.txt

# Move bundle to Documents
echo "Moving bundle to Documents..."
mv bundle.tar.gz ~/Documents/WritingAssistant/bundle.tar.gz

echo "Done building Canvo"

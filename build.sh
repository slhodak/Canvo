#!/bin/bash

set -e
set -o pipefail

ORIGINAL_DIR=$(pwd)

echo "Building shared types..."
cd shared/types
yarn build

echo "Building backend..."
cd $ORIGINAL_DIR || exit 1
cd backend
yarn build

echo "Building frontend..."
cd $ORIGINAL_DIR || exit 1
cd frontend
yarn build

echo "Creating bundle..."
cd $ORIGINAL_DIR || exit 1
tar -czf bundle.tar.gz -T distribution_files.txt

echo "Moving bundle to Documents..."
mv bundle.tar.gz ~/Documents/WritingAssistant/bundle.tar.gz

echo "Done building Writers Blocks"

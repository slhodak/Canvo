#!/bin/bash

set -e
set -o pipefail

ORIGINAL_DIR=$(pwd)

# Shared
echo "Building shared..."
cd $ORIGINAL_DIR || exit 1
cd shared
yarn build

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

echo "Done building Canvo"

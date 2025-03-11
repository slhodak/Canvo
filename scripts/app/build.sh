#!/bin/bash

set -e
set -o pipefail

# Exit if we are not in the root directory
if [ ! -d "scripts/app" ]; then
    echo "Error: This script must be run from the root directory of the project"
    exit 1
fi

# Shared
echo "Building shared..."
yarn build:shared

# Backend
echo "Building backend..."
yarn build:backend

# Frontend
echo "Building frontend..."
yarn build:frontend

# AI Service does not need to be built

# Create bundle
echo "Creating bundle..."
tar -czf bundle.tar.gz -T distribution_files.txt

echo "Done building Canvo"

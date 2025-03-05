#! /bin/bash

set -e
set -o pipefail

SERVER=$1 

# Check that SERVER is one of "blue" or "green"
if [ "$SERVER" != "blue" ] && [ "$SERVER" != "green" ]; then
    echo "Usage: $0 <blue|green>"
    exit 1
fi

./scripts/app/build.sh
./scripts/app/deploy.sh $SERVER

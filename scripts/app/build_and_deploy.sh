#! /bin/bash

set -e
set -o pipefail


./scripts/app/build.sh
./scripts/app/deploy.sh

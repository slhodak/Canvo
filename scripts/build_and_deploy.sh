#! /bin/bash

set -e
set -o pipefail


./build.sh
./deploy.sh

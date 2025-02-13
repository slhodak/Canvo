#!/bin/bash

cd ~/canvo/ai-service/
# Change the macOS torch dependendency to the CPU version
# Remove sentence-transformers too or else poetry will automatically reinstall it with its gpu dependency
poetry remove sentence-transformers torch
poetry source add --priority=supplemental torchcpu https://download.pytorch.org/whl/cpu
poetry add --source torchcpu torch
poetry add sentence-transformers
rm poetry.lock
poetry install

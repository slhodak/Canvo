#!/bin/bash

# Run with sudo

# For an AL2023 Server

# Node.js & Yarn
echo "Installing Node.js & Yarn..."
dnf install nodejs -y
npm i -g corepack
corepack enable

# Python & Poetry
echo "Installing Python & Poetry..."
dnf install python3.12 python3.12-pip -y
python3.12 -m pip install --user pipx
pipx ensurepath
source ~/.bashrc
pipx install poetry

# FastAPI
echo "Installing uvicorn..."
dnf install uvicorn -y

# Nginx
echo "Installing Nginx..."
sudo dnf install nginx -y
systemctl start nginx
systemctl enable nginx

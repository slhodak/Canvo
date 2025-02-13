#!/bin/bash

# For an AL2023 Server

# Node.js & Yarn
echo "Installing Node.js & Yarn..."
sudo dnf install nodejs yarn -y

# Python & Poetry
echo "Installing Python & Poetry..."
sudo dnf install python3.12 python3.12-pip -y
python3.12 -m pip install --user pipx
python3.12 -m ensurepath
source ~/.bashrc
pipx install poetry

# FastAPI
echo "Installing uvicorn..."
sudo dnf install uvicorn -y

# PostgreSQL
echo "Installing PostgreSQL..."
sudo dnf install postgresql16 postgresql16-server -y
sudo postgresql-setup --initdb
sudo systemctl start postgresql-16
sudo systemctl enable postgresql-16

# Nginx
echo "Installing Nginx..."
sudo dnf install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

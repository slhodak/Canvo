#!/bin/bash

# For an AL2023 Server

# Node.js & Yarn
sudo dnf install nodejs yarn -y

# Python & Poetry
sudo dnf install python3.12 python3.12-pip -y
python3.12 -m pip install --user pipx
python3.12 -m ensurepath
source ~/.bashrc
pipx install poetry

# FastAPI
sudo dnf install uvicorn -y

# PostgreSQL
sudo dnf install postgresql16 postgresl16-server -y
sudo postgresql-setup --initdb
sudo systemctl start postgresql-16
sudo systemctl enable postgresql-16

# Nginx
sudo dnf install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

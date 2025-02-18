#!/bin/bash

read -s -p "Enter the postgres password: " DB_PASSWORD

docker run -d \
        --name pgvector \
        -p 5433:5432 \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        pgvector/pgvector:pg17

unset DB_PASSWORD

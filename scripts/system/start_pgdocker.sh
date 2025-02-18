#!/bin/bash

read -s -p "Enter the postgres password: " DB_PASSWORD

docker run -d \
        --name pgvector \
        -p 5433:5432 \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        pgvector/pgvector:pg17

unset DB_PASSWORD

# Copy the pg_hba.conf file to the container
sudo docker cp /var/lib/pgsql/data/pg_hba.conf pgvector:/var/lib/postgresql/data/pg_hba.conf

# Allow password connections from the host machine at 172.17.0.1
sudo docker exec -it pgvector bash -c "echo \"host all all 172.17.0.1/32 md5\" >> /var/lib/postgresql/data/pg_hba.conf"

# Restart the container
sudo docker restart pgvector

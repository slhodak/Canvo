#!/bin/bash

# Run with sudo

cp nginx.conf /etc/nginx/nginx.conf
cp reverse-proxy.conf /etc/nginx/conf.d/reverse-proxy.conf
systemctl restart nginx

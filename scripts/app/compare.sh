#!/bin/bash

FILE1=$1
FILE2=$2

if [[ $(md5sum $FILE1 | cut -d' ' -f1) == $(md5sum $FILE2 | cut -d' ' -f1) ]]; then
    echo "y"
else
    echo "n"
fi

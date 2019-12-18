#!/bin/sh

pm2 stop qapi
rm qapi.exe
go build -o qapi.exe
pm2 start qapi.exe

while true; do
    
    if [[ $(git pull origin master) == *up-to-date* ]]; 
    then
        echo "no change"
    else
        echo "detect changes"
        sleep 2s
        echo "stop app"
		pm2 stop qapi
		rm qapi.exe
        go build -o qapi.exe
        pm2 restart qapi
    fi

    echo "sleep 30s"

    sleep 30s        

done

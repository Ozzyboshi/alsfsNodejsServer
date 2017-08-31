sudo usermod -a -G dialout ozzy
close and restart session

docker run -d -v /home/ozzy/tarquinia/alsfsNodejsServer:/server --device=/dev/ttyUSB0 -p 8081:8081 -w /server node node amigajsserver /dev/ttyUSB0 0.0.0.0
docker run --rm -it -v /home/ozzy/tarquinia/alsfsNodejsServer:/server --device=/dev/ttyUSB0 -p 8081:8081 -w /server node /bin/bash -c 'npm install && node amigajsserver /dev/ttyUSB0 0.0.0.0'
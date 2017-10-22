sudo usermod -a -G dialout ozzy
close and restart session

docker run -d -v /home/ozzy/tarquinia/alsfsNodejsServer:/server --device=/dev/ttyUSB0 -p 8081:8081 -w /server node node amigajsserver /dev/ttyUSB0 0.0.0.0
docker run --rm -it -v /home/ozzy/tarquinia/alsfsNodejsServer:/server --device=/dev/ttyUSB0 -p 8081:8081 -w /server node /bin/bash -c 'npm install && node amigajsserver /dev/ttyUSB0 0.0.0.0'

to run on a raspberry pi (tested on a raspberry pi model 1 with raspbian 7 wheezy)

get g++ and gcc 4.9 (you probably have to upgrade di jessie to do this)

install serialport with sudo npm install serialport --unsafe-perm --build-from-source

for a docker container inside a vm connected to a fs-uae virtual serial port: run the node image and install and lauch socat within the container, the --device docker flag won't work


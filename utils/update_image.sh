rm ~/dockerimages/node-mq-socket.tar
docker container stop mqsocket
docker container rm mqsocket
docker image rm node-mq-socket
docker build -t node-mq-socket .
docker save node-mq-socket > ~/dockerimages/node-mq-socket.tar
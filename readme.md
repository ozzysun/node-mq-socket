- docker build
  docker build -t node-mq-socket .
- docker run
  docker run --name=mqsocket -p 54321:54321 -d node-mq-socket
- docker build image file
  docker save node-mq-socket > ~/node-mq-socket.tar
- docker load image file
  docker load -i node-mq-socket.tar
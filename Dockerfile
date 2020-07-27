FROM node:12.17-alpine3.10
WORKDIR /usr/src/node-mq-socket
COPY package.json /usr/src/node-mq-socket/
RUN npm install
COPY . /usr/src/node-mq-socket
EXPOSE 54321
CMD ["node", "src/index"]
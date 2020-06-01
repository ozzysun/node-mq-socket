FROM node:12.16.2
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
EXPOSE 54321
CMD ["node", "src/index"]
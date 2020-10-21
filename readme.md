- 安裝
  npm install
- 執行
  node src/index --h --q --c
  預設會以conf設定參數執行 若有帶args參數 直以設定值執行
  支援參數
  - host | h : rabbit 主機id
  - channel | c: rabbit channel id
  - queue | q; rabbit queue id
  - port | p: socket使用的port
  - enable 啟動mq連線
  - disable 關閉mq連線
  
- 設定 conf/index/mq
  enable: true|false 設定是否開啟mq連線
  host: 要連接的mq主機id 參考mqHost
  channel: 要連接的mq主機channel
  queue: 設定要連接的queue名稱,注意個queue必須已經有定義在mqHost
- 設定 conf/index/redis
  enable: true|false 設定是否使用redis存放socket 連線id
  host: 要連接的redis主機ip or url
  port: 要連接的redis主機port
  password: 設定要連線redis的password
- 開發 app.js
  appInit: 要初始化應用程式的部份,第一個參數args為執行指令帶的args
  appRun: 當街收到mq message要執行的程式放這裡
- 以node 執行
  node src/index --(指定啟動參數 非必要)
- docker build
  docker build -t node-mq-socket .
- docker run
  docker run --name=mqsocket -p 54321:54321 -d node-mq-socket
- docker build image file
  docker save node-mq-socket > ~/node-mq-socket.tar
- docker load image file
  docker load -i node-mq-socket.tar
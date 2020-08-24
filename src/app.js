const express = require('express')
const OZSocket = require('./libs/OZSocket')
const { broadCast } = require('./libs/OZSocketClient')
const promMid = require('express-prometheus-middleware')
let socket = null
let testCount = 0
const appInit = (socketConfig) => {
  // 初始化socket
  if (socket === null) {
    const socketOpt = {
      port: 54321,
      channel: 'all',
      config: socketConfig
    }
    socket = getSocket(socketOpt)
  }
}
const appRun = (content, msg) => {
  // console.log(`Received [socket][noAck: true] queue Rock!! %s`, content)
  testCount = testCount + 1
  console.log(`testCount=${testCount}`)
  /*
  content = {
    url:非必要 要使用來廣播的socket server位置 預設為http://xxx:54321 // severUrl, server, serverURL 都可吃到
    path: "/socket/socket.io" || /socket.io // serverPath 也可以吃到
    room: 預設是all,一般以site為單位
    ns: 非必要 目前都會是用all
    from:
    to:
    data: { type: , state}
  }
  */
  broadCast(content, () => {
    console.log(`after run broad cast=${testCount}`)
    channel.ack(msg)
  })
  /*
  setTimeout(() => {
    console.log(`after run broad cast=${testCount}`)
    channel.ack(msg)
  },1000)
  */
}
// 建立socket server
const getSocket = ({ config, port, channel = 'all'}) => {
  const app = express()
  const router = express.Router()
  app.use('/', router)
  // -- prometheus---
  app.use(promMid({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5]
  }))
  const mySocket = new OZSocket({ app, config } )
  mySocket.listen((data) => {
    // console.log(`Socket RECEIVE Data =`)
    // console.log(data)
  })
  return mySocket
  
}
module.exports = { appInit, appRun }
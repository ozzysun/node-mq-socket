const { readYAML } = require('./libs/utils')
const { getChannelById, queueReceive } = require('./libs/mq-utils')
const defaultSetting = require('./setting')
const express = require('express')
const OZSocket = require('./libs/OZSocket')
const { broadCast } = require('./libs/OZSocketClient')
let socket = null
// 載入外部conf下的config檔案
const loadConfig = async(setting = null) => {
  if (setting === null) setting = defaultSetting
  const result = {}
  for (let i = 0; i < setting.files.length; i++) {
    result[setting.files[i].id] = await readYAML(setting.files[i].path)
  }
  result.dir = setting.dir
  result.require2 = require // 儲存require在動態載入用
  return result
}
// 建立socket server
const getSocket = ({ config, socketSite, port, channel = 'all'}) => {
  const app = express()
  const router = express.Router()
  app.use('/', router)
  const mySocket = new OZSocket({ app, config, socketSite } )
  mySocket.listen((data) => {
    // console.log(`Socket RECEIVE Data =${data}`)
  })
  return mySocket
  
}
const mqInit = async({hostData, hostId, channelId }) => {
  // 取得設定檔
  const mqConfig = hostData[hostId]
  // 建立連線 建立channel
  const channel = await getChannelById(mqConfig, channelId).catch(e => {
    console.log(e)
  })
  const queueArray = [
    { 
      name: 'socket',
      handler: (channel, content, msg) => {
        console.log(`Received [socket][noAck: true] queue Rock!! %s`, content)
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
        broadCast(content)
      },
      option: {
        noAck: true
      }
    }
  ]
  await queueReceive(channel, queueArray)
}
const run = async() => {
  // 載入設定檔
  const configData = await loadConfig(defaultSetting)
  // 初始化socket
  if (socket === null) {
    const socketOpt = {
      port: 54321,
      channel: 'all',
      config: configData.config,
      socketSite: configData.socketSite
    }
    socket = getSocket(socketOpt)
  }
  // 監聽mq
  const mqOpt = {
    hostData: configData.mqHost,
    hostId: 'rabbitRD', // TODO: 需要依照環境改主機
    channelId: 'main'
  }
  await mqInit(mqOpt)
}
run()
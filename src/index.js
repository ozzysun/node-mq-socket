const { readYAML } = require('./libs/utils')
const { getChannelById, queueReceive } = require('./libs/mq-utils')
const defaultSetting = require('./setting')
const express = require('express')
const MySocket = require('./libs/OZSocket')
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
const socketInit = ({ config, socketSite, port, channel = 'all'}) => {
  const app = express()
  const router = express.Router()
  app.use('/', router)
  const mySocket = new MySocket({ app, config, socketSite } )
  mySocket.listen((data) => {
    console.log(`Socket RECEIVE Data =${data}`)
  })
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
      name: 'hello',
      handler: (channel, content, msg) => {
        setTimeout(() => {
          console.log(`Received [hello]noAck: false] queue %s`, content)
          console.log(content)
          channel.ack(msg)
        }, 2000)
      },option: {
        noAck: false
      }
    },
    { 
      name: 'socket',
      handler: (channel, content, msg) => {
        console.log(`Received [socket][noAck: true] queue Rock!! %s`, content)
        console.log(content)
      },
      option: {
        noAck: true
      }
    },
  ]
  await queueReceive(channel, queueArray)
}
const run = async() => {
  // 載入設定檔
  const configData = await loadConfig(defaultSetting)
  // 初始化socket
  const socketOpt = {
    port: 54321,
    channel: 'all',
    config: configData.config,
    socketSite: configData.socketSite
  }
  socketInit(socketOpt)
  // 監聽mq
  const mqOpt = {
    hostData: configData.mqHost,
    hostId: 'rabbitRD',
    channelId: 'main'
  }
  await mqInit(mqOpt)
}
run()
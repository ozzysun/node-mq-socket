const { getArgs, createConfFolder } = require('./libs/utils')
const { readYAML } = require('./libs/file')
const { getChannelById, queueReceive } = require('./libs/mq-utils')
const defaultSetting = require('./setting')
const { appInit, appRun } = require('./app')
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
const mqInit = async({hostData, hostId, channelId, queue }) => {
  // 取得設定檔
  const mqConfig = hostData[hostId]
  // 建立連線 建立channel
  const channel = await getChannelById(mqConfig, channelId).catch(e => {
    console.log(e)
  })
  const queueArray = [
    { 
      name: queue,
      handler: (channel, content, msg) => {
        appRun(content, msg)
      },
      option: {
        noAck: false
      }
    }
  ]
  await queueReceive(channel, queueArray)
}
const run = async() => {
  // 檢查並建立設定檔
  await createConfFolder(defaultSetting)
  // 載入設定檔
  const configData = await loadConfig(defaultSetting)
  const args = getArgs()
  appInit(args, configData.config)
  // 監聽mq
  const mqOpt = {
    hostData: configData.mqHost,
    hostId: args.hostId !== null ? args.hostId : configData.config.mq.host, // TODO: 需要依照環境改主機
    channelId: args.channelId !== null ? args.channelId : configData.config.mq.channel,
    queue: args.queueId !== null ? args.queueId :configData.config.mq.queue
  }
  await mqInit(mqOpt)
}
run()
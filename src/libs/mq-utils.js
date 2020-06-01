const amqp = require('amqplib')
// 建立連線並取得channel
const getChannel = async(id, { protocol = 'amqp', hostname = 'localhost', port = '5672', frameMax = 0, heartbeat = 0, vhost = '/', username, password }, isConfirm = false) => {
  const opt = { protocol, hostname, port, frameMax, heartbeat, vhost }
  if (username !== undefined) opt.username = username
  if (password !== undefined) opt.password = password
  const connection = await (await amqp.connect(opt))
  let channel
  if (isConfirm) {
    channel = await connection.createConfirmChannel()
  } else {
    channel = await connection.createChannel()
  }
  // 建立channel下所有的queue
  return channel
}
// 接收mq queue = [ { queue:, handler:, qoption, option:}]
const queueReceive = async(channel, queueArray) => {
  queueArray.forEach(item => {
    // 監聽
    const option = { noAck: false }
    if (item.option !== undefined) {
      for (const prop in item.option) {
        option[prop] = item.option[prop]
      }
    }
    channel.consume(item.name, (msg) => {
      const contentStr = msg.content.toString()
      let obj
      // 傳入非格式訊息 { data: , type:} 則以字串當作格式化
      if (contentStr.indexOf('"data"') !== -1) {
        obj = JSON.parse(contentStr)
      } else {
        obj = {
          data: contentStr,
          type: 'string'
        }
      }
      item.handler(channel, obj.data, msg)
    }, option)
  })
}
// 發送訊息
const queueSend = async(channel, { queue = 'main', data, option = null}) => {
  const sendObj = {
    type: typeof data,
    data
  }
  if (option !== null) {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(sendObj)), option)
  } else {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(sendObj)))
  }
  console.log(' [x] Send %s to %s', data, queue)
}
// --public 取得channel 並建立channel下的queue { config: mqConf設定檔資料, host:mq主機id, channel:channel id}
const getChannelById = async(config, channel) => {
  // 建立channel
  const channelData = config.channel[channel]
  if (channelData === undefined) {
    throw new Error(`channelId:${channel} not exist`)
  }
  const currentChannel = await getChannel(channel, config.config, config.isConfirm)
  // 建立channel下的queue與exchange
  if (channelData.queue !== undefined) {
    for (let i = 0; i < channelData.queue.length; i++) {
      currentChannel.assertQueue(channelData.queue[i].id, channelData.queue[i].option)
    }
  }
  if (channelData.exchange !== undefined) {
    for (let i = 0; i < channelData.exchange.length; i++) {
      currentChannel.assertExchange(channelData.exchange[i].id, channelData.exchange[i].type, channelData.exchange[i].option)
    }
  }
  return currentChannel
}
// 取得允許使用的queue與exchange清單
const getAllow = async(config, channel) => {
  const current = config.channel[channel]
  if (current === undefined) return null
  const result = { queue: [], exchange: [] }
  if (current.queue && Array.isArray(current.queue)) {
    current.queue.forEach(item => {
      result.queue.push(item.id)
    })
  }
  if (current.exchange && Array.isArray(current.exchange)) {
    current.exchange.forEach(item => {
      result.exchange.push(item.id)
    })
  }
  return result
}
module.exports = { getChannel, queueReceive, queueSend, getChannelById }

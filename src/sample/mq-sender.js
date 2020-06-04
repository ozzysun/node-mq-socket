
const { getChannelById, queueSend } = require('../libs/mq-utils')
const { readYAML } = require('../libs/utils')
const path = require('path')
const hostConfig = path.resolve('../../conf/mqHost.yml')
const run = async() => {
  // 取得設定檔
  const hostData = await readYAML(hostConfig)
  const mqConfig = hostData['rabbitRD']
  // 建立連線 建立channel
  const channel = await getChannelById(mqConfig, 'main').catch(e => {
    console.log(e)
  })
  const content = {
    url: 'http://192.168.0.99:54321',
    path: null,
    room: 'mmjd5566',
    from: 'sender',
    to: 'kds/mmjd5566/000000',
    data: {
      type: 'WebMenu.HaveNewOrder',
      state: {
        name: 'oz'
      }
    }
  }
  await queueSend(channel, { queue: 'socket', data: content })
}
run()


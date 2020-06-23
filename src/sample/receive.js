const { getSocketClient } = require('../libs/OZSocketClient')
const run = () => {
  const opt = {
    url: 'http://127.0.0.1:54321',
    path: null,
    room: 'mmjd5566'
  }
  getSocketClient(opt, (client) => {
    client.on(opt.room, (data) => {
      console.log(`got [${opt.room}] event`)
      console.log(data)
    })
  })
}
run()
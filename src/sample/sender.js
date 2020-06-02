const { getSocketClient, broadCast, send } = require('../libs/OZSocketClient')
const runBroadCast = () => {
  const opt = {
    url: 'http://localhost:54321',
    path: null,
    room: 'mmjd5566',
    from: 'sender',
    to: 'test',
    data: {
      type: 'new',
      state: {
        name: 'oz'
      }
    }
  }
  broadCast(opt, (client) => {
    
  })
}
const runSend = () => {
  const opt = {
    url: 'http://localhost:54321',
    path: null,
    room: 'mmjd5566'
  }
  getSocketClient(opt, (client) => {
    console.log('client==')
    console.log(client)
    const obj = {
      from: 'sender',
      to: 'mmjd5566', 
      data: {
        type: 'new',
        state: { name: 'oz'}
      }
    }
    send(client, obj)
  })
}
runBroadCast()
// runSend()
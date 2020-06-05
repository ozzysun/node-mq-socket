const { getSocketClient, broadCast, send } = require('../libs/OZSocketClient')
const runBroadCast = () => {
  const opt = {
    url: 'http://localhost',
    path: '/socket.io',
    room: 'testroom',
    from: 'sender',
    to: 'oz',
    data: {
      type: 'HaveNewOrder',
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
    url: 'http://localhost',
    path: '/socket.io',
    room: 'testroom'
  }
  getSocketClient(opt, (client) => {
    console.log('client==')
    console.log(client)
    const obj = {
      from: 'sender',
      to: 'oz',
      data: {
        type: 'HaveNewOrder',
        state: {
          name: 'oz'
        }
      }
    }
    send(client, obj)
  })
}
// runBroadCast()
runSend()
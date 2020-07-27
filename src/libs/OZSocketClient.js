const socketClient = require('socket.io-client')
// 由server端廣播出去
/* 標準要吃的架構
  dataObj = {
    url:非必要 要使用來廣播的socket server位置 預設為http://xxx:54321 // severUrl, server, serverURL 都可吃到
    path: "/socket/socket.io" || /socket.io // serverPath 也可以吃到
    room: 預設是all,一般以site為單位
    ns: 非必要 目前都會是用all
    from:
    to:
    data: { type: , state}
  }
*/
const broadCast = (dataObj = null, callback = null) => {
  if (dataObj === null) {
    callback(null)
    return
  }
  // 取得連線client物件
  getSocketClient(dataObj, (client) => {
    send(client, {
      from: dataObj.from || 'BroadCastServer',
      to: dataObj.to,
      data: dataObj.data
    }, () => {
      if (callback !== null) callback(dataObj)
    })
  })
}
/*
dataObj = {
  url:非必要 要使用來廣播的socket server位置 預設為http://xxx:54321 // severUrl, server, serverURL 都可吃到
  path: "/socket/socket.io" || /socket.io // serverPath 也可以吃到
  ns: 非必要 目前都會是用all
  room: 預設是all,一般以site為單位
}
ex: socket server位置為 https://xxx.xxx:54321
{
  url: 'http://xxx.xxx.xx:54321',
  path: '/socket.io'
  room: 'myroom'
}
ex: socket server位置為 https://xxx.xxx/socket
{
  url: 'http://xxx.xxx.xx:54321',
  path: '/socket/socket.io'
  room: 'myroom'
}
*/
// 取得連線client物件
const getSocketClient = (dataObj, callback = null) => {
  // 取得廣播需要的參數
  const { url, path, room } = getSocketParams(dataObj)
  // 建立client物件
  const opt = { reconnect: true, secure: url.indexOf('https') !== -1 }
  if (path !== null && path !== 'null') opt.path = path
  const client = socketClient(url, opt)
  client.room = room // 紀錄room在client上
  // event handler
  client.on('connect', () => {
    trace(`Connected url=${url} path=${path}`)
    if (callback !== null) callback(client)
  })
  client.on('connect_error', (error) => {
    trace(`[ERROR]Connect Error url=${url} path=${path}`)
    trace(error)
  })
  client.on('connect_timeout', (error) => {
    trace(`[ERROR]Connect Timeout url=${url} path=${path}`)
    trace(error)
  })
  client.on('error', (error) => {
    trace(`[ERROR]Error url=${url} path=${path}`)
    trace(error)
  })
}
const send = (client, { from, to, data }, callback = null) => {
  const opt = {
    from, to, data,
    time: new Date().getTime()
  }
  client.emit(client.room, opt)
  client.disconnect()
  if (callback !== null) callback()
}
// 取得連線設定 TODO
const getSocketParams = (dataObj, port= 54321) => {
  // 如果設定值為url或 server 或serverUrl都可接受 否則預設為localhost, 若未帶prototo補進去
  let url = dataObj.url || dataObj.server || dataObj.serverUrl || dataObj.serverURL || `http://127.0.0.1:${port}`
  // 測試
  // url = 'http://127.0.0.1:54321'
  // 沒有http則補上port
  if (url.indexOf('http') === -1) url = `http://${url}:${port}`
  // 有設定ns則加入url內
  if (dataObj.ns !== undefined && dataObj.ns !== 'all') url = `${url}/${dataObj.ns}`
  // room 預設為 all
  const room = dataObj.room !== undefined ? dataObj.room : 'all'
  if (room !== 'all') url = `${url}?room=${room}`
  const path = dataObj.path || dataObj.serverPath || null
  return { url, path, room }
}
const trace = (info) => {
  console.log(`[OZSocketClient]${info}`)
}
module.exports = { getSocketClient, broadCast, send }

/* eslint-disable new-cap */
'use strict'
const http = require('http')
const Server = require('socket.io')
const client = require('socket.io-client')
const moment = require('moment')
const redis = require('socket.io-redis')
class OZSocket {
  constructor({ app = null, config, socketSite = null, defaultRoom = 'all' }) {
    this.isInit = false
    this.config = config
    this.socketSite = socketSite
    this.defaultRoom = defaultRoom
    this.init(app)
  }
  init(app) {
    if (this.isInit) return
    this.app = app
    this.http = http.Server(this.app)
    // 取得允許使用的site 當把all拿掉 就一定要透過指定namespace才能連
    this.nsArray = this.socketSite.all
    this.nsObj = {} // 存放namespace socket server
    const opts = {
      pingTimeout: 60000, // 100秒timeout
      pingInterval: 25000, // 與client ping pong的時間距離
      serveClient: true,
      transports: ['polling', 'websocket']
    }
    this.io = new Server(this.http, opts)
    // 設定使用redis
    if (this.config.redis !== undefined && this.config.redis.enable) {
      this.io.adapter(redis({ host: this.config.redis.host, port: this.config.redis.port }))
    }
    this.isInit = true
  }
  listen(callback = null) {
    this.http.listen(this.config.port, () => {
      this.trace(`listening on *:${this.config.port} nsArray.length=${this.nsArray.length}`)
    })
    // -- 加入namespace ----
    for (let i = 0; i < this.nsArray.length; i++) {
      const ns = this.nsArray[i]
      let server = ns === 'all' ? this.io : this.io.of(`/${ns}`) // 當ns 為空白,代表/ ,
      if (this.config.redis !== undefined && this.config.redis.enable) {
        server = ns === 'all' ? this.io : this.io.of(`/${ns}`).adapter
      }
      server.on('connection', (socket) => {
        const now = new Date().toLocaleString()
        // --- join--
        const siteRoom = socket.handshake.query.room
        if (siteRoom === undefined) {
          socket.disconnect(false)
          return
        }
        socket.join(siteRoom, () => {
          console.log('join room ==' + siteRoom)
        })
        // ---
        this.getClients(server, (clients) => {
          if (ns === 'all') {
            this.log(`[${now}]新連線加入!! 目前總連線數=${clients.length}`)
          } else {
            this.log(`[${now}] (${ns})新連線加入!! 目前連線數=${clients.length}`)
          }
        })
        this.socketHandler(server, socket, siteRoom, callback)
      })
      this.nsObj[ns] = server
    }
  }
  /* server:連線的socket server(含ns) ,socket: 該次連線的socket indtance*/
  socketHandler(server, socket, room, callback = null) {
    if (server.name !== undefined && server.name.indexOf('info') !== -1) {
      socket.on(room, (data) => {
        this.log(`info socket收到資料 from:${data.from} to:${data.to} 時間:${moment(data.time, 'x').utc().add(8, 'h').format('MM/DD HH:mm')}`)
        // 給socketServer的才處理
        if (data.to === 'SocketServer') this.infoHandler(server, socket, room, data)
      })
    } else {
      socket.on(room, (data) => {
        this.log(`socket收到資料 from:${data.from} to:${data.to} 時間:${moment(data.time, 'x').utc().add(8, 'h').format('MM/DD HH:mm')}`)
        server.emit(room, data) // include user
        if (callback !== null) callback(data)
      })
    }
    // -- 連線與斷線測試 --
    socket.on('disconnect', () => {
      const now = new Date().toLocaleString()
      this.getClients(server, (clients) => {
        if (server.name === undefined) {
          this.log(`[${now}]使用者斷線!! 總連線數=${clients.length}`)
        } else {
          this.log(`[${now}](${server.name})使用者斷線!! 目前連線數=${clients.length}`)
        }
      })
    })
    // --
    socket.on('error', (error) => {
      this.log('socket error=')
      this.log(error)
    })
    // --
    socket.on('join', (room) => {
      socket.leave()
      socket.join(room)
      console.log('join room=' + room)
      for (const prop in this.io.sockets.adapter.rooms) {
        console.log('room=' + prop + ' length=' + this.io.sockets.adapter.rooms[room].length)
      }
    })
    socket.on('leave', (room) => {
      socket.leave()
    })
  }
  // 專處理info data
  infoHandler(server, socket, room, data) {
    const eventType = data.data.type
    const eventValue = data.data.state
    // --取得要執行的指令
    switch (eventType) {
      // 取得全部連線數量
      case 'GetAllSocketInfo':
        this.getAllInfo((result) => {
          const resultData = {
            from: data.to,
            to: data.from,
            data: {
              type: 'GetAllSocketInfo',
              state: result
            }
          }
          server.emit(room, resultData) // include user
        })
        break
      case 'GetSocketDetailInfo':
        this.getSocketDetailInfo(eventValue, (result) => {
          const resultData = {
            from: data.to,
            to: data.from,
            data: {
              type: 'GetSocketDetailInfo',
              state: result
            }
          }
          server.emit(room, resultData) // include user
        })
        break
      default:
        server.emit(room, data) // include user
    }
  }
  close() {
    this.io.close()
  }
  log(info) {
    // TODO:儲存記錄
    this.trace(info)
  }
  // 取得 clients數量,server 已經依照ns分,還要把裡面的room取出來
  getClients(server = null, callback = null) {
    if (server === null) server = this.io
    server.clients((err, clients) => {
      if (err) {
        console.log(err)
      } else {
        if (callback !== null) callback(clients)
      }
    })
  }
  // 由namespace字串取得 目前連線clients
  getClientsByName(nsName = 'all', callback = null) {
    if (this.nsArray.indexOf(nsName) !== -1) {
      const server = nsName === 'all' ? this.io : this.nsObj[nsName].server
      this.getClients(server, callback)
    } else {
      if (callback !== null) callback([])
    }
  }
  // 取得連線數量
  getClientsCount(nsName = 'all', callback = null) {
    if (this.nsArray.indexOf(nsName) !== -1) {
      const server = nsName === 'all' ? this.io : this.nsObj[nsName]
      this.getClients(server, (clients) => {
        if (callback !== null) callback(clients.length)
      })
    } else {
      if (callback !== null) callback(0)
    }
  }
  // 取得所有的namespace的連線資訊
  getAllInfo(callback) {
    let index = 0
    const result = []
    const run = () => {
      if (index < this.nsArray.length) {
        const nsName = this.nsArray[index]
        this.getClientsCount(nsName, (count) => {
          result.push({ name: nsName, count: count })
          index = index + 1
          run()
        })
      } else {
        callback(result)
      }
    }
    run()
  }
  // 取得指定ns的socket詳細資料
  getSocketDetailInfo(nsName, callback) {
    const nodeName = nsName === 'all' ? '/' : `/${nsName}`
    const allConnected = this.io.nsps[nodeName].connected
    const result = []
    for (const prop in allConnected) {
      const connected = allConnected[prop]
      let remoteIp = connected.handshake.address
      remoteIp = remoteIp.replace('::ffff:', '')
      remoteIp = remoteIp.replace('::1', 'localhost')
      result.push(remoteIp)
    }
    if (callback !== null) callback(result)
  }
  // 由server端廣播出去
  broadCast(dataObj = null, callback = null) {
    /*
    dataObj = {
      serverURL:非必要 要使用來廣播的socket server位置 http://xxx:54321
      serverPath:
      ns: 非必要 目前都會是用all
      room: 預設是all,一般以site為單位
      from:
      to:
      data:
    }
    _serverUrl="https://rd.jabezpos.com"
    _serverPath="/socket/socket.io" || /socket.io
    */
    let _serverUrl, socket, _serverPath, _room
    if (dataObj !== null) {
      _room = (dataObj.room !== undefined) ? dataObj.room : 'all'
      _serverUrl = dataObj.server || 'http://localhost:54321'
      if (_serverUrl.indexOf('http') === -1) _serverUrl = `http://${_serverUrl}:54321`
      _serverPath = dataObj.serverPath || null
      if (dataObj.ns !== undefined && dataObj.ns !== 'all') _serverUrl = `${_serverUrl}/${dataObj.ns}`
      if (_room !== 'all') _serverUrl = `${_serverUrl}?room=${_room}`
      // console.log('_serverUrl='+_serverUrl+" _serverPath="+_serverPath)
      if (_serverUrl.indexOf('https') !== -1) {
        if (_serverPath === null || _serverPath === 'null') {
          socket = client(_serverUrl, { reconnect: true, secure: true })
        } else {
          socket = client(_serverUrl, { reconnect: true, secure: true, path: _serverPath })
        }
      } else {
        if (_serverPath === null || _serverPath === 'null') {
          socket = client(_serverUrl, { reconnect: true })
        } else {
          socket = client(_serverUrl, { reconnect: true, path: _serverPath })
        }
      }
      this.trace(`broadcast _serverUrl=${_serverUrl} _serverPath=${_serverPath} room=${_room}`)
      socket.on('connect', () => {
        const data = {
          from: dataObj.from || 'BroadCastServer',
          to: dataObj.to,
          time: new Date().getTime(),
          data: dataObj.data
        }
        socket.emit(_room, data)
        setTimeout(() => {
          socket.disconnect()
        }, 300)
        if (callback !== null) callback(data)
      })
    } else {
      if (callback !== null) callback(null)
    }
  }
  trace(info) {
    console.log(`[OZSocket]${info}`)
  }
}
module.exports = OZSocket

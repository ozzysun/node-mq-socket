/* eslint-disable new-cap */
'use strict'
const http = require('http')
const Server = require('socket.io')
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
          this.log(`join room =${siteRoom} client_id=${socket.id}`)
        })
        // ---
        this.getClients(server, (clients) => {
          this.log(`[${now}][${ns}]新連線加入!! 目前總連線數=${clients.length}`)
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
      this.log('join room=' + room)
      for (const prop in this.io.sockets.adapter.rooms) {
        this.log('room=' + prop + ' length=' + this.io.sockets.adapter.rooms[room].length)
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
        this.log(err)
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
  trace(info) {
    console.log(`[OZSocket]${info}`)
  }
}
module.exports = OZSocket

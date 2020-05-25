const path = require('path')
const process = require('process')
module.exports = {
  files: [
    {
      id: 'config',
      path: path.resolve('./conf/index.yml'),
      default: {
        port: 54321,
        redis: {
          enable: false,
          host: 'localhost',
          port: 6379
        }
      }
    },
    {
      id: 'socketSite',
      path: path.resolve('./conf/socketSite.yml'),
      default: {
        all: [ 'all', 'info'],
        develop: [],
        stage: [],
        master: [],
        us: [],
        usdev: []
      }
    },
    {
      id: 'mqHost',
      path: path.resolve('./conf/mqHost.yml'),
      default: {
        rabbitLocal: {
          config: {
            protocol: 'amqp',
            hostname: 'localhost',
            port: 5672,
            username: 'admin',
            password: '5578360',
            frameMax: 0,
            heartbeat: 0,
            vhost: '/'
          },
          channel: {
            main: {
              isConfirm: false,
              queue: [
                { id: 'socket',
                  common: '發送sock廣播用',
                  option: { durable: false }
                }
              ],
              exchange: [
                { id: 'ex_hello',
                  common: '測試用',
                  type: 'direct',
                  option: { durable: false }
                }
              ]
            }
          }
        }
      }
    }
  ],
  dir: {
    root: process.cwd(), // 整個project根目錄 /ozapi
    bin: __dirname // 執行點的目錄 /ozpai/src 或 /ozapi/dist
  }
}

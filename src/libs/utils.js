const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
// yaml 讀取
const readYAML = async(sourceFile) => {
  const filePath = path.resolve(sourceFile)
  return new Promise((resolve, reject) => {
    try {
      const doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'))
      resolve(doc)
    } catch (e) {
      reject(e)
    }
  })
}
module.exports = { readYAML }

const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const sftpSessions = new Map()

function registerSFTPIPC() {
  ipcMain.handle('sftp:init', async (event, tabId) => {
    const { connections } = require('./ssh')
    const entry = connections.get(tabId)
    if (!entry) throw new Error('Не подключено')

    return new Promise((resolve, reject) => {
      entry.client.sftp((err, sftp) => {
        if (err) return reject(err)
        sftpSessions.set(tabId, sftp)
        resolve(true)
      })
    })
  })

  ipcMain.handle('sftp:list', async (_event, tabId, remotePath) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) return reject(err)
        resolve(list.map(item => ({
          name: item.filename,
          size: item.attrs.size,
          isDirectory: (item.attrs.mode & 0o40000) !== 0,
          mode: item.attrs.mode,
          mtime: item.attrs.mtime * 1000
        })))
      })
    })
  })

  ipcMain.handle('sftp:pwd', async (_event, tabId) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    return new Promise((resolve, reject) => {
      sftp.realpath('.', (err, p) => {
        if (err) return reject(err)
        resolve(p)
      })
    })
  })

  ipcMain.handle('sftp:stat', async (_event, tabId, remotePath) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err, stats) => {
        if (err) return reject(err)
        resolve({
          size: stats.size,
          isDirectory: stats.isDirectory(),
          mode: stats.mode,
          mtime: stats.mtime * 1000
        })
      })
    })
  })

  ipcMain.handle('sftp:download', async (event, tabId, remotePath, localPath) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    const win = BrowserWindow.fromWebContents(event.sender)

    return new Promise((resolve, reject) => {
      sftp.stat(remotePath, (err, attrs) => {
        if (err) return reject(err)

        if (attrs.isDirectory()) {
          downloadDir(sftp, remotePath, localPath, win, tabId)
            .then(resolve)
            .catch(reject)
        } else {
          const totalSize = attrs.size
          let downloaded = 0

          const readStream = sftp.createReadStream(remotePath)
          const writeStream = fs.createWriteStream(localPath)

          readStream.on('data', (chunk) => {
            downloaded += chunk.length
            win.webContents.send('sftp:progress', tabId, {
              operation: 'download',
              file: path.basename(remotePath),
              transferred: downloaded,
              total: totalSize
            })
          })

          readStream.pipe(writeStream)

          writeStream.on('finish', () => resolve(true))
          writeStream.on('error', reject)
          readStream.on('error', reject)
        }
      })
    })
  })

  ipcMain.handle('sftp:upload', async (event, tabId, localPath, remotePath) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    const win = BrowserWindow.fromWebContents(event.sender)

    return new Promise((resolve, reject) => {
      const localStat = fs.statSync(localPath)

      if (localStat.isDirectory()) {
        uploadDir(sftp, localPath, remotePath, win, tabId)
          .then(resolve)
          .catch(reject)
      } else {
        const totalSize = localStat.size
        let uploaded = 0

        const readStream = fs.createReadStream(localPath)
        const writeStream = sftp.createWriteStream(remotePath)

        readStream.on('data', (chunk) => {
          uploaded += chunk.length
          win.webContents.send('sftp:progress', tabId, {
            operation: 'upload',
            file: path.basename(localPath),
            transferred: uploaded,
            total: totalSize
          })
        })

        readStream.pipe(writeStream)

        writeStream.on('close', () => resolve(true))
        writeStream.on('error', reject)
        readStream.on('error', reject)
      }
    })
  })

  ipcMain.handle('sftp:mkdir', async (_event, tabId, remotePath) => {
    const sftp = sftpSessions.get(tabId)
    if (!sftp) throw new Error('SFTP не инициализирован')

    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => {
        if (err) return reject(err)
        resolve(true)
      })
    })
  })

  ipcMain.handle('sftp:close', async (_event, tabId) => {
    const sftp = sftpSessions.get(tabId)
    if (sftp) {
      try { sftp.end() } catch {}
      sftpSessions.delete(tabId)
    }
    return true
  })
}

async function downloadDir(sftp, remoteDir, localDir, win, tabId) {
  fs.mkdirSync(localDir, { recursive: true })

  const list = await new Promise((resolve, reject) => {
    sftp.readdir(remoteDir, (err, items) => {
      if (err) return reject(err)
      resolve(items)
    })
  })

  for (const item of list) {
    const remotePath = `${remoteDir}/${item.filename}`
    const localPath = path.join(localDir, item.filename)

    if (item.attrs.isDirectory()) {
      await downloadDir(sftp, remotePath, localPath, win, tabId)
    } else {
      await new Promise((resolve, reject) => {
        const totalSize = item.attrs.size
        let downloaded = 0

        const readStream = sftp.createReadStream(remotePath)
        const writeStream = fs.createWriteStream(localPath)

        readStream.on('data', (chunk) => {
          downloaded += chunk.length
          win.webContents.send('sftp:progress', tabId, {
            operation: 'download',
            file: item.filename,
            transferred: downloaded,
            total: totalSize
          })
        })

        readStream.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
        readStream.on('error', reject)
      })
    }
  }
}

async function uploadDir(sftp, localDir, remoteDir, win, tabId) {
  await new Promise((resolve, reject) => {
    sftp.mkdir(remoteDir, (err) => {
      if (err && err.code !== 4) return reject(err)
      resolve()
    })
  })

  const entries = fs.readdirSync(localDir)

  for (const entry of entries) {
    const localPath = path.join(localDir, entry)
    const remotePath = `${remoteDir}/${entry}`
    const stat = fs.statSync(localPath)

    if (stat.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath, win, tabId)
    } else {
      const totalSize = stat.size
      let uploaded = 0

      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(localPath)
        const writeStream = sftp.createWriteStream(remotePath)

        readStream.on('data', (chunk) => {
          uploaded += chunk.length
          win.webContents.send('sftp:progress', tabId, {
            operation: 'upload',
            file: entry,
            transferred: uploaded,
            total: totalSize
          })
        })

        readStream.pipe(writeStream)
        writeStream.on('close', resolve)
        writeStream.on('error', reject)
        readStream.on('error', reject)
      })
    }
  }
}

module.exports = { registerSFTPIPC }

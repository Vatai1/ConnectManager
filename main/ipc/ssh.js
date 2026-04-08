const { ipcMain, BrowserWindow } = require('electron')
const { Client } = require('ssh2')
const fs = require('fs')
const database = require('../database')

const connections = new Map()

function registerSSHIPC() {
  ipcMain.handle('ssh:connect', async (event, tabId, sessionId) => {
    const session = database.getSession(sessionId)
    if (!session) throw new Error('Сессия не найдена')

    const client = new Client()
    const win = BrowserWindow.fromWebContents(event.sender)

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        connections.set(tabId, { client, sessionId })
        resolve({ connected: true })
      })

      client.on('error', (err) => {
        reject(err)
      })

      client.on('close', () => {
        connections.delete(tabId)
        win.webContents.send('ssh:disconnected', tabId)
      })

      const opts = {
        host: session.host,
        port: session.port,
        username: session.username
      }

      if (session.private_key_path) {
        try {
          opts.privateKey = fs.readFileSync(session.private_key_path)
          if (session.password) opts.passphrase = session.password
        } catch {
          opts.password = session.password
        }
      } else if (session.password) {
        opts.password = session.password
      }

      client.connect(opts)
    })
  })

  ipcMain.handle('ssh:shell', async (event, tabId) => {
    const entry = connections.get(tabId)
    if (!entry) throw new Error('Не подключено')

    const win = BrowserWindow.fromWebContents(event.sender)

    return new Promise((resolve, reject) => {
      entry.client.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) return reject(err)

        stream.on('data', (data) => {
          win.webContents.send('ssh:data', tabId, data.toString('utf-8'))
        })

        stream.stderr?.on('data', (data) => {
          win.webContents.send('ssh:data', tabId, data.toString('utf-8'))
        })

        stream.on('close', () => {
          win.webContents.send('ssh:closed', tabId)
        })

        const streamRef = { stream }

        ipcMain.handle(`ssh:write:${tabId}`, async (_e, data) => {
          streamRef.stream.write(data)
        })

        ipcMain.handle(`ssh:resize:${tabId}`, async (_e, cols, rows) => {
          try {
            streamRef.stream.setWindow(rows, cols, 0, 0)
          } catch {}
        })

        resolve(true)
      })
    })
  })

  ipcMain.handle('ssh:disconnect', async (_event, tabId) => {
    const entry = connections.get(tabId)
    if (entry) {
      try { entry.client.end() } catch {}
      connections.delete(tabId)
    }
    removeAllSessionHandlers(tabId)
    return true
  })
}

function removeAllSessionHandlers(tabId) {
  ipcMain.removeHandler(`ssh:write:${tabId}`)
  ipcMain.removeHandler(`ssh:resize:${tabId}`)
}

function disconnectAll() {
  for (const [id, entry] of connections) {
    try { entry.client.end() } catch {}
    removeAllSessionHandlers(id)
  }
  connections.clear()
}

module.exports = { registerSSHIPC, disconnectAll, connections }

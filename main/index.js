const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const database = require('./database')
const { registerSessionIPC } = require('./ipc/sessions')
const { registerSSHIPC } = require('./ipc/ssh')
const { registerSFTPIPC } = require('./ipc/sftp')
const { registerCredentialsIPC } = require('./ipc/credentials')
const { registerFoldersIPC } = require('./ipc/folders')

let mainWindow = null
let credentialsWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'SSH Manager',
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'out', 'renderer', 'index.html'))
  }
}

function openCredentialsWindow() {
  if (credentialsWindow && !credentialsWindow.isDestroyed()) {
    credentialsWindow.focus()
    return
  }

  credentialsWindow = new BrowserWindow({
    width: 600,
    height: 550,
    minWidth: 450,
    minHeight: 400,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Профили кредов',
    show: false
  })

  credentialsWindow.on('ready-to-show', () => {
    credentialsWindow.show()
  })

  credentialsWindow.on('closed', () => {
    credentialsWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    credentialsWindow.loadURL(process.env.ELECTRON_RENDERER_URL + '?window=credentials')
  } else {
    credentialsWindow.loadFile(path.join(__dirname, '..', 'out', 'renderer', 'index.html'), {
      query: { window: 'credentials' }
    })
  }
}

app.whenReady().then(() => {
  registerSessionIPC()
  registerSSHIPC()
  registerSFTPIPC()
  registerCredentialsIPC()
  registerFoldersIPC()

  ipcMain.handle('open-credentials-window', () => {
    openCredentialsWindow()
    return true
  })

  registerGlobalErrorHandling()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  const { disconnectAll } = require('./ipc/ssh')
  disconnectAll()
  database.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerGlobalErrorHandling() {
  ipcMain.handle('show-error', async (_event, { message, stack }) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Ошибка',
      message: message || 'Неизвестная ошибка',
      detail: stack || '',
      buttons: ['Копировать и закрыть', 'Закрыть'],
      defaultId: 1,
      noLink: true
    })
    if (result.response === 0) {
      const { clipboard } = require('electron')
      clipboard.writeText(stack || message)
    }
  })
}

const { ipcMain } = require('electron')
const database = require('../database')

function registerCredentialsIPC() {
  ipcMain.handle('credentials:getAll', async () => {
    return database.getAllCredentials()
  })

  ipcMain.handle('credentials:get', async (_event, id) => {
    return database.getCredential(id)
  })

  ipcMain.handle('credentials:add', async (_event, cred) => {
    return database.addCredential(cred)
  })

  ipcMain.handle('credentials:update', async (_event, cred) => {
    database.updateCredential(cred)
    return true
  })

  ipcMain.handle('credentials:delete', async (_event, id) => {
    database.deleteCredential(id)
    return true
  })
}

module.exports = { registerCredentialsIPC }

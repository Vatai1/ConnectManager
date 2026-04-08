const { ipcMain } = require('electron')
const database = require('../database')

function registerSessionIPC() {
  ipcMain.handle('db:init', async (_event, masterPassword) => {
    return await database.init(masterPassword)
  })

  ipcMain.handle('db:exists', async () => {
    return database.dbExists()
  })

  ipcMain.handle('sessions:getAll', async () => {
    return database.getAllSessions()
  })

  ipcMain.handle('sessions:get', async (_event, id) => {
    return database.getSession(id)
  })

  ipcMain.handle('sessions:getGroups', async () => {
    return database.getGroups()
  })

  ipcMain.handle('sessions:add', async (_event, session) => {
    return database.addSession(session)
  })

  ipcMain.handle('sessions:update', async (_event, session) => {
    database.updateSession(session)
    return true
  })

  ipcMain.handle('sessions:delete', async (_event, id) => {
    database.deleteSession(id)
    return true
  })
}

module.exports = { registerSessionIPC }

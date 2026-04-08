const { ipcMain } = require('electron')
const database = require('../database')

function registerFoldersIPC() {
  ipcMain.handle('folders:getAll', async () => {
    return database.getAllFolders()
  })

  ipcMain.handle('folders:add', async (_event, folder) => {
    return database.addFolder(folder)
  })

  ipcMain.handle('folders:update', async (_event, folder) => {
    database.updateFolder(folder)
    return true
  })

  ipcMain.handle('folders:delete', async (_event, id) => {
    database.deleteFolder(id)
    return true
  })

  ipcMain.handle('moveItem', async (_event, type, itemId, targetFolderId, sortOrder) => {
    database.moveItem(type, itemId, targetFolderId, sortOrder)
    return true
  })
}

module.exports = { registerFoldersIPC }

const { ipcMain, BrowserWindow } = require('electron')
const database = require('../database')
const { applyThemeToAllWindows, saveTheme, loadSavedTheme } = require('../theme')

function registerSettingsIPC() {
  ipcMain.handle('settings:get', async (_event, key, defaultValue) => {
    try {
      return database.getSetting(key, defaultValue)
    } catch {
      if (key === 'theme') return loadSavedTheme()
      return defaultValue
    }
  })

  ipcMain.handle('settings:set', async (event, key, value) => {
    database.setSetting(key, value)
    if (key === 'theme') {
      applyThemeToAllWindows(value)
      saveTheme(value)
    }
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      win.webContents.send('settings:changed', { [key]: value })
    }
    return true
  })

  ipcMain.handle('settings:getAll', async () => {
    return {
      theme: database.getSetting('theme', 'dark'),
      terminalFontSize: database.getSetting('terminalFontSize', 14),
      defaultPort: database.getSetting('defaultPort', 22),
      terminalFont: database.getSetting('terminalFont', 'Consolas, "Courier New", monospace'),
    }
  })
}

module.exports = { registerSettingsIPC }

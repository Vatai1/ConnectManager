const { BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const THEME_FILE = path.join(__dirname, '..', 'theme.json')

const THEMES = {
  dark: { bg: '#0d1117', overlayColor: '#161b22', symbolColor: '#8b949e' },
  light: { bg: '#f0f2f5', overlayColor: '#ffffff', symbolColor: '#5f6368' }
}

function getThemeColors(theme) {
  return THEMES[theme] || THEMES.dark
}

function loadSavedTheme() {
  try {
    if (fs.existsSync(THEME_FILE)) {
      const data = JSON.parse(fs.readFileSync(THEME_FILE, 'utf8'))
      if (data.theme) return data.theme
    }
  } catch {}
  return 'dark'
}

function saveTheme(theme) {
  try {
    fs.writeFileSync(THEME_FILE, JSON.stringify({ theme }), 'utf8')
  } catch {}
}

function applyThemeToAllWindows(theme) {
  const t = getThemeColors(theme)
  for (const win of BrowserWindow.getAllWindows()) {
    win.setBackgroundColor(t.bg)
    win.setTitleBarOverlay({ color: t.overlayColor, symbolColor: t.symbolColor, height: 36 })
  }
}

module.exports = { getThemeColors, applyThemeToAllWindows, loadSavedTheme, saveTheme, THEMES }

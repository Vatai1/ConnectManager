import React, { useState, useEffect } from 'react'

const api = window.api

const THEMES = [
  { value: 'dark', label: 'Тёмная' },
  { value: 'light', label: 'Светлая' },
]

const FONTS = [
  'Consolas, "Courier New", monospace',
  '"Cascadia Code", Consolas, monospace',
  '"Fira Code", Consolas, monospace',
  '"JetBrains Mono", Consolas, monospace',
  '"Source Code Pro", Consolas, monospace',
]

export default function SettingsWindow() {
  const [theme, setTheme] = useState('dark')
  const [terminalFontSize, setTerminalFontSize] = useState(14)
  const [defaultPort, setDefaultPort] = useState(22)
  const [terminalFont, setTerminalFont] = useState(FONTS[0])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.settings.getAll().then(s => {
      setTheme(s.theme)
      setTerminalFontSize(s.terminalFontSize)
      setDefaultPort(s.defaultPort)
      setTerminalFont(s.terminalFont)
      document.documentElement.setAttribute('data-theme', s.theme)
    }).catch(() => {})

    const unsubSettings = api.settings.onChange((changes) => {
      if (changes.theme !== undefined) {
        document.documentElement.setAttribute('data-theme', changes.theme)
      }
    })
    return () => { if (unsubSettings) unsubSettings() }
  }, [])

  const handleSave = async () => {
    try {
      await api.settings.set('theme', theme)
      await api.settings.set('terminalFontSize', terminalFontSize)
      await api.settings.set('defaultPort', defaultPort)
      await api.settings.set('terminalFont', terminalFont)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(e.message)
    }
  }

  const fontSizeOptions = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24]

  return (
    <div className="sw-layout">
      <div className="sw-header">
        <h2>⚙️ Настройки</h2>
      </div>

      <div className="sw-content">
        <div className="sw-section">
          <h3 className="sw-section-title">Оформление</h3>

          <div className="sw-field">
            <label>Тема</label>
            <div className="sw-theme-toggle">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  className={`sw-theme-btn ${theme === t.value ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(t.value)
                    document.documentElement.setAttribute('data-theme', t.value)
                    api.settings.set('theme', t.value)
                  }}
                >
                  {t.value === 'dark' ? '🌙' : '☀️'} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sw-section">
          <h3 className="sw-section-title">Терминал</h3>

          <div className="sw-field">
            <label>Размер шрифта</label>
            <select value={terminalFontSize} onChange={e => setTerminalFontSize(Number(e.target.value))}>
              {fontSizeOptions.map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>

          <div className="sw-field">
            <label>Шрифт</label>
            <select value={terminalFont} onChange={e => setTerminalFont(e.target.value)}>
              {FONTS.map(f => (
                <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sw-section">
          <h3 className="sw-section-title">Подключения</h3>

          <div className="sw-field">
            <label>Порт по умолчанию</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={defaultPort}
              onChange={e => setDefaultPort(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="sw-footer">
        {saved && <span className="sw-saved">✓ Сохранено</span>}
        <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import MasterPassword from './components/MasterPassword'
import SessionPanel from './components/SessionPanel'
import TabBar from './components/TabBar'

const api = window.api
let tabCounter = 0

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [sessions, setSessions] = useState([])
  const [credentials, setCredentials] = useState([])
  const [folders, setFolders] = useState([])
  const [tabs, setTabs] = useState({})
  const [statusMessage, setStatusMessage] = useState('Готово')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    api.settings.get('theme', 'dark').then(setTheme).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const loadSessions = useCallback(async () => {
    try {
      const list = await api.sessions.getAll()
      setSessions(list)
    } catch (e) {
      handleSafeError(e)
    }
  }, [])

  const loadCredentials = useCallback(async () => {
    try {
      const list = await api.credentials.getAll()
      setCredentials(list)
    } catch (e) {
      handleSafeError(e)
    }
  }, [])

  const loadFolders = useCallback(async () => {
    try {
      const list = await api.folders.getAll()
      setFolders(list)
    } catch (e) {
      handleSafeError(e)
    }
  }, [])

  const loadAll = useCallback(async () => {
    await Promise.all([loadSessions(), loadCredentials(), loadFolders()])
  }, [loadSessions, loadCredentials, loadFolders])

  const handleSafeError = async (e) => {
    const message = e?.message || String(e)
    const stack = e?.stack || message
    try {
      await api.showError(message, stack)
    } catch {
      alert(message + '\n\n' + stack)
    }
  }

  const safe = (fn) => async (...args) => {
    try {
      return await fn(...args)
    } catch (e) {
      handleSafeError(e)
    }
  }

  useEffect(() => {
    if (!authenticated) return
    loadAll()

    const unsubDisconnect = api.ssh.onDisconnected((tabId) => {
      setTabs(prev => {
        const next = { ...prev }
        delete next[tabId]
        return next
      })
      setStatusMessage('Соединение разорвано')
    })

    const unsubSettings = api.settings.onChange((changes) => {
      if (changes.theme !== undefined) setTheme(changes.theme)
    })

    return () => {
      unsubDisconnect()
      unsubSettings()
    }
  }, [authenticated])

  const handleConnect = safe(async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    const tabId = `tab-${Date.now()}-${++tabCounter}`

    await api.ssh.connect(tabId, sessionId)
    await api.ssh.shell(tabId)

    setTabs(prev => ({
      ...prev,
      [tabId]: { session, sessionId }
    }))
    setStatusMessage(`Подключено к ${session.host}`)
  })

  const handleDisconnect = safe(async (tabId) => {
    await api.ssh.disconnect(tabId)
    await api.sftp.close(tabId).catch(() => {})
    setTabs(prev => {
      const next = { ...prev }
      delete next[tabId]
      return next
    })
    setStatusMessage('Отключено')
  })

  const openCredentials = () => {
    api.openCredentialsWindow()
  }

  const openSettings = () => {
    api.openSettingsWindow()
  }

  if (!authenticated) {
    return (
      <MasterPassword
        onAuth={() => {
          setAuthenticated(true)
        }}
        onError={handleSafeError}
      />
    )
  }

  return (
    <ErrorBoundary>
      <div className="app-layout">
        <div className="sidebar">
          <div className="session-panel-header">
            <h3><span className="header-icon">⚡</span> Сессии</h3>
            <div className="header-actions">
              <button className="btn btn-small" onClick={openCredentials} title="Профили кредов">
                🔑 Креды
              </button>
              <button className="btn btn-small" onClick={openSettings} title="Настройки">
                ⚙️
              </button>
            </div>
          </div>
          <SessionPanel
            sessions={sessions}
            folders={folders}
            credentials={credentials}
            onRefresh={loadAll}
            onConnect={handleConnect}
            onError={handleSafeError}
          />
        </div>
        <div className="main-content">
          <TabBar
            tabs={tabs}
            onDisconnect={handleDisconnect}
            statusMessage={statusMessage}
            onError={handleSafeError}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}

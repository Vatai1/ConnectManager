import React, { useState, useEffect } from 'react'
import TerminalTab from './TerminalTab'
import SftpPanel from './SftpPanel'

export default function TabBar({ tabs, onDisconnect, statusMessage, onError }) {
  const [activeTab, setActiveTab] = useState(null)
  const [subTab, setSubTab] = useState({})
  const tabIds = Object.keys(tabs)

  useEffect(() => {
    if (tabIds.length > 0 && (!activeTab || !tabs[activeTab])) {
      setActiveTab(tabIds[tabIds.length - 1])
    }
  }, [tabIds.length, activeTab, tabs])

  if (tabIds.length === 0) {
    return (
      <div className="tab-bar-empty">
        <div className="empty-state-large">
          <p>Нет активных подключений</p>
          <p className="hint">Дважды кликните по сессии слева для подключения</p>
        </div>
        <div className="status-bar">{statusMessage}</div>
      </div>
    )
  }

  const current = tabs[activeTab]
  const currentSubTab = subTab[activeTab] || 'terminal'

  return (
    <div className="tab-bar">
      <div className="tab-headers">
        {tabIds.map(id => {
          const t = tabs[id]
          return (
            <div
              key={id}
              className={`tab-header ${id === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <span>{t.session.name} ({t.session.username}@{t.session.host})</span>
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onDisconnect(id) }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {activeTab && tabs[activeTab] && (
        <div className="sub-tabs">
          <button
            className={`sub-tab ${currentSubTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setSubTab(prev => ({ ...prev, [activeTab]: 'terminal' }))}
          >
            Терминал
          </button>
          <button
            className={`sub-tab ${currentSubTab === 'sftp' ? 'active' : ''}`}
            onClick={() => setSubTab(prev => ({ ...prev, [activeTab]: 'sftp' }))}
          >
            SFTP
          </button>
        </div>
      )}

      <div className="tab-content">
        {tabIds.map(id => {
          const sub = subTab[id] || 'terminal'
          const isActive = id === activeTab
          return (
            <div key={id} className="tab-pane" style={{ display: isActive ? 'flex' : 'none' }}>
              <div style={{ display: sub === 'terminal' ? 'contents' : 'none', flex: 1 }}>
                <TerminalTab tabId={id} />
              </div>
              <div style={{ display: sub === 'sftp' ? 'contents' : 'none', flex: 1 }}>
                <SftpPanel tabId={id} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="status-bar">{statusMessage}</div>
    </div>
  )
}

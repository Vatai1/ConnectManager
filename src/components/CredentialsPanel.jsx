import React, { useState } from 'react'
import CredentialsDialog from './CredentialsDialog'

const api = window.api

export default function CredentialsPanel({ credentials, onRefresh, onError }) {
  const [showDialog, setShowDialog] = useState(false)
  const [editCred, setEditCred] = useState(null)

  const handleAdd = () => {
    setEditCred(null)
    setShowDialog(true)
  }

  const handleEdit = (cred) => {
    setEditCred(cred)
    setShowDialog(true)
  }

  const handleSave = async (data) => {
    try {
      if (data.id) {
        await api.credentials.update(data)
      } else {
        await api.credentials.add(data)
      }
      setShowDialog(false)
      setEditCred(null)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот профиль кредов? Связанные сессии будут отвязаны.')) return
    try {
      await api.credentials.delete(id)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="credentials-panel">
      <div className="credentials-panel-header">
        <h3>Профили кредов</h3>
        <button className="btn btn-small" onClick={handleAdd}>+ Добавить</button>
      </div>

      <div className="credentials-list">
        {credentials.length === 0 && (
          <div className="empty-state">Нет профилей</div>
        )}
        {credentials.map(cred => (
          <div key={cred.id} className="credential-item">
            <div className="credential-info">
              <span className="credential-name">{cred.name}</span>
              <span className="credential-user">{cred.username}</span>
              {cred.private_key_path && (
                <span className="credential-key">🔑 {cred.private_key_path.split(/[\\/]/).pop()}</span>
              )}
            </div>
            <div className="credential-actions">
              <button className="btn btn-small" onClick={() => handleEdit(cred)}>✎</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(cred.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {showDialog && (
        <CredentialsDialog
          credential={editCred}
          onSave={handleSave}
          onCancel={() => { setShowDialog(false); setEditCred(null) }}
        />
      )}
    </div>
  )
}

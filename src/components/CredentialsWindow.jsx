import React, { useState, useEffect, useCallback } from 'react'
import CredentialsDialog from './CredentialsDialog'

const api = window.api

export default function CredentialsWindow() {
  const [credentials, setCredentials] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [editCred, setEditCred] = useState(null)

  const load = useCallback(async () => {
    try {
      const list = await api.credentials.getAll()
      setCredentials(list)
    } catch (e) {
      alert(e.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот профиль кредов? Связанные сессии будут отвязаны.')) return
    try {
      await api.credentials.delete(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="cw-layout">
      <div className="cw-header">
        <h2>Профили кредов</h2>
        <button className="btn btn-primary" onClick={handleAdd}>+ Новый профиль</button>
      </div>

      <div className="cw-list">
        {credentials.length === 0 && (
          <div className="cw-empty">
            <p>Нет сохранённых профилей</p>
            <p className="cw-hint">Создайте профиль, чтобы быстро привязывать креды к сессиям</p>
          </div>
        )}
        {credentials.map(cred => (
          <div key={cred.id} className="cw-card">
            <div className="cw-card-info">
              <span className="cw-card-name">{cred.name}</span>
              <span className="cw-card-user">{cred.username}</span>
              <div className="cw-card-details">
                <span className="cw-card-detail">
                  {cred.password ? '●●●●●●●●' : 'Без пароля'}
                </span>
                {cred.private_key_path && (
                  <span className="cw-card-detail cw-key">
                    🔑 {cred.private_key_path.split(/[\\/]/).pop()}
                  </span>
                )}
              </div>
            </div>
            <div className="cw-card-actions">
              <button className="btn btn-small" onClick={() => handleEdit(cred)}>Редактировать</button>
              <button className="btn btn-small btn-danger" onClick={() => handleDelete(cred.id)}>Удалить</button>
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

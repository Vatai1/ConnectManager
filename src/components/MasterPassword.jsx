import React, { useState, useEffect } from 'react'

const api = window.api

export default function MasterPassword({ onAuth, onError }) {
  const [isNew, setIsNew] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.db.exists().then(exists => setIsNew(!exists)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Введите пароль')
      return
    }
    if (isNew && password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    try {
      await api.db.init(password)
      onAuth()
    } catch (err) {
      setError(err.message || 'Ошибка')
    }
  }

  return (
    <div className="master-password-overlay">
      <div className="master-password-dialog">
        <h2>{isNew ? 'Установить мастер-пароль' : 'Ввести мастер-пароль'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {isNew && (
            <div className="form-group">
              <label>Подтверждение</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Войти</button>
          </div>
        </form>
      </div>
    </div>
  )
}

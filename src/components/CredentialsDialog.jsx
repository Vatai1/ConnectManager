import React, { useState } from 'react'

export default function CredentialsDialog({ credential, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: credential?.name || '',
    username: credential?.username || '',
    password: credential?.password || '',
    private_key_path: credential?.private_key_path || '',
    use_default_key: credential?.use_default_key || false,
  })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      id: credential?.id
    })
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2>{credential ? 'Редактирование профиля' : 'Новый профиль кредов'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название профиля</label>
            <input value={form.name} onChange={e => handleChange('name', e.target.value)}
              placeholder="Например: Production root" autoFocus />
          </div>
          <div className="form-group">
            <label>Пользователь</label>
            <input value={form.username} onChange={e => handleChange('username', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={form.password}
              onChange={e => handleChange('password', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.use_default_key}
                onChange={e => {
                  const val = e.target.checked
                  handleChange('use_default_key', val)
                  if (val) handleChange('private_key_path', '')
                }} />
              Использовать SSH-ключ по умолчанию (~/.ssh/)
            </label>
          </div>
          <div className="form-group">
            <label>SSH ключ (путь)</label>
            <input value={form.private_key_path}
              onChange={e => handleChange('private_key_path', e.target.value)}
              placeholder="C:\Users\...\.ssh\id_rsa"
              disabled={form.use_default_key} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={onCancel}>Отмена</button>
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'

const api = window.api

export default function SessionDialog({ session, credentials = [], allTags = [], defaultFolderId, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: session?.name || '',
    host: session?.host || '',
    port: session?.port || 22,
    username: session?.username || '',
    password: session?.password || '',
    private_key_path: session?.private_key_path || '',
    folder_id: session?.folder_id || defaultFolderId || null,
    credential_id: session?.credential_id || null,
  })
  const [tags, setTags] = useState(session?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [useProfile, setUseProfile] = useState(!!session?.credential_id)
  const [folders, setFolders] = useState([])

  useEffect(() => {
    api.folders.getAll().then(setFolders).catch(() => {})
  }, [])

  const folderOptions = useMemo(() => {
    const result = [{ id: null, name: '(Корень)', depth: 0 }]
    const addChildren = (parentId, depth) => {
      for (const f of folders) {
        if ((f.parent_id || null) === parentId) {
          result.push({ id: f.id, name: '  '.repeat(depth) + f.name, depth })
          addChildren(f.id, depth + 1)
        }
      }
    }
    addChildren(null, 0)
    return result
  }, [folders])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleProfileChange = (credId) => {
    const id = credId ? Number(credId) : null
    if (!id) {
      setForm(prev => ({ ...prev, credential_id: null, username: '', password: '', private_key_path: '' }))
      return
    }
    const cred = credentials.find(c => c.id === id)
    if (cred) {
      setForm(prev => ({
        ...prev,
        credential_id: cred.id,
        username: cred.username,
        password: cred.password,
        private_key_path: cred.private_key_path
      }))
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      id: session?.id,
      tags,
      port: Number(form.port),
      credential_id: useProfile ? form.credential_id : null
    })
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2>{session ? 'Редактирование сессии' : 'Новая сессия'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 3 }}>
              <label>Хост</label>
              <input value={form.host} onChange={e => handleChange('host', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Порт</label>
              <input type="number" min={1} max={65535} value={form.port}
                onChange={e => handleChange('port', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Папка</label>
            <select value={form.folder_id || ''} onChange={e => handleChange('folder_id', e.target.value || null)}>
              {folderOptions.map(f => (
                <option key={f.id ?? 'root'} value={f.id || ''}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="form-divider" />

          <div className="form-group">
            <div className="toggle-row">
              <label className="toggle-label">
                <input type="checkbox" checked={useProfile}
                  onChange={e => {
                    setUseProfile(e.target.checked)
                    if (!e.target.checked) {
                      setForm(prev => ({ ...prev, credential_id: null }))
                    }
                  }} />
                Использовать профиль кредов
              </label>
            </div>
          </div>

          {useProfile ? (
            <div className="form-group">
              <label>Профиль</label>
              <select value={form.credential_id || ''} onChange={e => handleProfileChange(e.target.value)}>
                <option value="">— Выберите профиль —</option>
                {credentials.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.username})</option>
                ))}
              </select>
            </div>
          ) : (
            <>
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
                <label>SSH ключ</label>
                <input value={form.private_key_path}
                  onChange={e => handleChange('private_key_path', e.target.value)} />
              </div>
            </>
          )}

          {useProfile && form.credential_id && (
            <div className="credential-preview">
              <span>Пользователь: <strong>{form.username}</strong></span>
              <span>Ключ: {form.private_key_path || 'нет'}</span>
            </div>
          )}

          <div className="form-divider" />

          <div className="form-group">
            <label>Теги</label>
            <div className="tag-input-row">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Добавить тег (Enter)" list="tags-list" />
              <datalist id="tags-list">
                {allTags.filter(t => !tags.includes(t)).map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="tag-list">
              {tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
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

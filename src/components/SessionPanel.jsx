import React, { useState, useMemo, useCallback } from 'react'
import SessionDialog from './SessionDialog'

const api = window.api

function buildTree(folders, sessions) {
  const folderMap = new Map()
  folderMap.set(null, { id: null, name: '', parent_id: null, children: [], sessions: [] })

  for (const f of folders) {
    folderMap.set(f.id, { ...f, children: [], sessions: [] })
  }

  for (const f of folders) {
    const node = folderMap.get(f.id)
    const parent = folderMap.get(f.parent_id || null)
    if (parent) parent.children.push(node)
  }

  for (const s of sessions) {
    const parent = folderMap.get(s.folder_id || null)
    if (parent) parent.sessions.push(s)
  }

  return folderMap.get(null)
}

export default function SessionPanel({ sessions, folders, credentials, onRefresh, onConnect, onError }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const [showDialog, setShowDialog] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [preFolder, setPreFolder] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [renameFolder, setRenameFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [newFolderParent, setNewFolderParent] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragItem, setDragItem] = useState(null)

  const credMap = useMemo(() => {
    const m = new Map()
    for (const c of credentials) m.set(c.id, c)
    return m
  }, [credentials])

  const allTags = useMemo(() => [...new Set(sessions.flatMap(s => s.tags || []))], [sessions])

  const tree = useMemo(() => {
    return buildTree(folders || [], sessions)
  }, [folders, sessions])

  const toggleFolder = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSession = (folderId) => {
    setEditSession(null)
    setPreFolder(folderId)
    setShowDialog(true)
  }

  const handleEditSession = (session) => {
    setEditSession(session)
    setPreFolder(null)
    setShowDialog(true)
  }

  const handleSaveSession = async (data) => {
    try {
      if (data.id) {
        await api.sessions.update(data)
      } else {
        await api.sessions.add(data)
      }
      setShowDialog(false)
      setEditSession(null)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const handleDeleteSession = async (id) => {
    if (!confirm('Удалить эту сессию?')) return
    try {
      await api.sessions.delete(id)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const handleCreateFolder = async (parentId) => {
    if (!newFolderName.trim()) {
      setNewFolderParent(parentId)
      return
    }
    try {
      await api.folders.add({ name: newFolderName.trim(), parent_id: parentId })
      setNewFolderName('')
      setNewFolderParent(null)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const handleRenameFolder = async (id) => {
    if (!renameValue.trim()) {
      setRenameFolder(null)
      return
    }
    try {
      const folder = (await api.folders.getAll()).find(f => f.id === id)
      if (folder) {
        await api.folders.update({ ...folder, name: renameValue.trim() })
      }
      setRenameFolder(null)
      setRenameValue('')
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const handleDeleteFolder = async (id) => {
    if (!confirm('Удалить папку и все подпапки? Сессии будут перемещены в корень.')) return
    try {
      await api.folders.delete(id)
      onRefresh()
    } catch (e) {
      onError(e)
    }
  }

  const getDisplayUser = (session) => {
    if (session.credential_id) {
      const cred = credMap.get(session.credential_id)
      return cred ? cred.username : '?'
    }
    return session.username
  }

  // --- Drag & Drop ---

  const handleDragStart = (e, type, id) => {
    setDragItem({ type, id })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${type}:${id}`)
  }

  const handleDragOver = (e, targetFolderId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragItem) return

    if (dragItem.type === 'folder' && dragItem.id === targetFolderId) return

    try {
      await api.moveItem(dragItem.type, dragItem.id, targetFolderId, 0)
      onRefresh()
    } catch (err) {
      onError(err)
    }
    setDragItem(null)
  }

  // --- Context menu ---

  const showCtx = (e, items) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  const closeCtx = () => setContextMenu(null)

  // --- Render ---

  const renderFolder = (folder, depth) => {
    const isOpen = expanded.has(folder.id)
    const isRenaming = renameFolder === folder.id
    const isNewHere = newFolderParent === folder.id

    return (
      <div key={`f-${folder.id}`}>
        <div
          className={`tree-folder ${dragItem?.type === 'folder' && dragItem?.id === folder.id ? 'dragging' : ''}`}
          style={{ paddingLeft: depth * 16 + 4 }}
          draggable
          onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDrop={(e) => handleDrop(e, folder.id)}
          onContextMenu={(e) => showCtx(e, [
            { label: 'Новая папка', action: () => setNewFolderParent(folder.id) },
            { label: 'Новая сессия', action: () => handleAddSession(folder.id) },
            { label: 'Переименовать', action: () => { setRenameFolder(folder.id); setRenameValue(folder.name) } },
            { label: 'Удалить', action: () => handleDeleteFolder(folder.id), danger: true },
          ])}
        >
          <span className="tree-toggle" onClick={() => toggleFolder(folder.id)}>
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="tree-icon">📁</span>
          {isRenaming ? (
            <input
              className="tree-rename-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameFolder(folder.id)
                if (e.key === 'Escape') setRenameFolder(null)
              }}
              autoFocus
            />
          ) : (
            <span className="tree-folder-name">{folder.name}</span>
          )}
        </div>

        {isOpen && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
            {folder.sessions.map(s => renderSession(s, depth + 1))}
            {isNewHere && (
              <div className="tree-new-folder" style={{ paddingLeft: (depth + 1) * 16 + 4 }}>
                <span className="tree-icon">📁</span>
                <input
                  className="tree-rename-input"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onBlur={() => handleCreateFolder(folder.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateFolder(folder.id)
                    if (e.key === 'Escape') { setNewFolderParent(null); setNewFolderName('') }
                  }}
                  placeholder="Имя папки"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderSession = (session, depth) => {
    return (
      <div
        key={`s-${session.id}`}
        className="tree-session"
        style={{ paddingLeft: depth * 16 + 4 }}
        draggable
        onDragStart={(e) => handleDragStart(e, 'session', session.id)}
        onDoubleClick={() => onConnect(session.id)}
        onContextMenu={(e) => showCtx(e, [
          { label: 'Подключиться', action: () => onConnect(session.id) },
          { label: 'Редактировать', action: () => handleEditSession(session) },
          { label: 'Удалить', action: () => handleDeleteSession(session.id), danger: true },
        ])}
      >
        <span className="tree-icon">🖥</span>
        <span className="tree-session-info">
          <span className="tree-session-name">
            {session.name}
            {session.credential_id && <span className="cred-badge">🔗</span>}
          </span>
          <span className="tree-session-host">{getDisplayUser(session)}@{session.host}:{session.port}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="session-panel" onClick={closeCtx}>
      <div className="session-panel-actions">
        <button className="btn btn-small" onClick={() => { setNewFolderParent('root'); setNewFolderName('') }} title="Новая папка">📁 Папка</button>
        <button className="btn btn-small btn-primary" onClick={() => handleAddSession(null)}>+ Сессия</button>
      </div>

      <input
        className="search-input"
        placeholder="Поиск..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="tree-container"
        onDragOver={(e) => handleDragOver(e, null)}
        onDrop={(e) => handleDrop(e, null)}
        onContextMenu={(e) => showCtx(e, [
          { label: 'Новая папка', action: () => { setNewFolderParent('root'); setNewFolderName('') } },
          { label: 'Новая сессия', action: () => handleAddSession(null) },
        ])}
      >
        {tree.children.map(child => renderFolder(child, 0))}
        {tree.sessions
          .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.host.toLowerCase().includes(search.toLowerCase()))
          .map(s => renderSession(s, 0))}

        {newFolderParent === 'root' && (
          <div className="tree-new-folder" style={{ paddingLeft: 4 }}>
            <span className="tree-icon">📁</span>
            <input
              className="tree-rename-input"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onBlur={() => { if (newFolderName.trim()) handleCreateFolder(null); else { setNewFolderParent(null); setNewFolderName('') } }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder(null)
                if (e.key === 'Escape') { setNewFolderParent(null); setNewFolderName('') }
              }}
              placeholder="Имя папки"
              autoFocus
            />
          </div>
        )}

        {tree.children.length === 0 && tree.sessions.length === 0 && (
          <div className="empty-state">Нет сессий. Нажмите ПКМ для создания.</div>
        )}
      </div>

      {showDialog && (
        <SessionDialog
          session={editSession}
          allTags={allTags}
          credentials={credentials}
          defaultFolderId={preFolder}
          onSave={handleSaveSession}
          onCancel={() => { setShowDialog(false); setEditSession(null) }}
        />
      )}

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.items.map((item, i) => (
            <button
              key={i}
              className={item.danger ? 'danger' : ''}
              onClick={() => { item.action(); closeCtx() }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'

const api = window.api

function formatSize(bytes) {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('ru-RU')
}

export default function SftpPanel({ tabId }) {
  const [remotePath, setRemotePath] = useState('/')
  const [remoteItems, setRemoteItems] = useState([])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const listRemote = useCallback(async (path) => {
    try {
      const items = await api.sftp.list(tabId, path)
      setRemoteItems(items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return b.isDirectory ? 1 : -1
        return a.name.localeCompare(b.name)
      }))
      setRemotePath(path)
    } catch (e) {
      setError(e.message)
    }
  }, [tabId])

  useEffect(() => {
    if (!tabId) return

    const unsubProgress = api.sftp.onProgress((tid, p) => {
      if (tid === tabId) setProgress(p)
    })

    const initSftp = async () => {
      try {
        await api.sftp.init(tabId)
        const pwd = await api.sftp.pwd(tabId)
        setRemotePath(pwd)
        await listRemote(pwd)
        setReady(true)
      } catch (e) {
        setError(`SFTP недоступен: ${e.message}`)
      }
    }

    initSftp()

    return () => {
      unsubProgress()
      api.sftp.close(tabId).catch(() => {})
    }
  }, [tabId, listRemote])

  const handleRemoteDoubleClick = async (item) => {
    const newPath = remotePath === '/' ? `/${item.name}` : `${remotePath}/${item.name}`
    if (item.isDirectory) {
      await listRemote(newPath)
    }
  }

  const handleRemoteNav = () => {
    const parts = remotePath.split('/').filter(Boolean)
    parts.pop()
    const parent = '/' + parts.join('/')
    listRemote(parent || '/')
  }

  const handleUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = async () => {
      setError('')
      for (const file of input.files) {
        try {
          const remoteFilePath = remotePath === '/' ? `/${file.name}` : `${remotePath}/${file.name}`
          setProgress({ operation: 'upload', file: file.name, transferred: 0, total: file.size })

          await api.sftp.upload(tabId, file.path, remoteFilePath)

          setProgress(null)
        } catch (e) {
          setError(`Ошибка загрузки ${file.name}: ${e.message}`)
          setProgress(null)
        }
      }
      listRemote(remotePath)
    }
    input.click()
  }

  const handleDownload = async (item) => {
    try {
      const remoteFilePath = remotePath === '/' ? `/${item.name}` : `${remotePath}/${item.name}`
      setProgress({ operation: 'download', file: item.name, transferred: 0, total: item.size })

      const saveName = item.name
      await api.sftp.download(tabId, remoteFilePath, saveName)
      setProgress(null)
    } catch (e) {
      setError(`Ошибка скачивания: ${e.message}`)
      setProgress(null)
    }
  }

  if (error && !ready) {
    return <div className="sftp-error">{error}</div>
  }

  return (
    <div className="sftp-panel">
      <div className="sftp-split">
        <div className="sftp-side">
          <div className="sftp-header">
            <span>Удалённая файловая система</span>
          </div>
          <div className="sftp-path">
            <input
              value={remotePath}
              onChange={e => setRemotePath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && listRemote(remotePath)}
            />
            <button onClick={() => listRemote(remotePath)}>⟳</button>
            <button onClick={handleRemoteNav}>↑</button>
          </div>
          <div className="sftp-list">
            {remoteItems.map(item => (
              <div
                key={item.name}
                className={`sftp-item ${item.isDirectory ? 'directory' : ''}`}
                onDoubleClick={() => handleRemoteDoubleClick(item)}
              >
                <span className="sftp-item-icon">{item.isDirectory ? '📁' : '📄'}</span>
                <span className="sftp-item-name">{item.name}</span>
                <span className="sftp-item-size">{item.isDirectory ? '' : formatSize(item.size)}</span>
                <span className="sftp-item-date">{formatDate(item.mtime)}</span>
              </div>
            ))}
            {remoteItems.length === 0 && ready && (
              <div className="empty-state">Папка пуста</div>
            )}
          </div>
        </div>
      </div>

      <div className="sftp-actions">
        <button onClick={handleUpload} className="btn btn-primary">Загрузить файл →</button>
        <span className="hint" style={{ fontSize: '11px', color: '#999' }}>
          ПКМ по файлу для скачивания
        </span>
        {progress && (
          <div className="sftp-progress">
            <span>{progress.operation === 'upload' ? '↑' : '↓'} {progress.file}</span>
            <div className="progress-bar">
              <div className="progress-fill"
                style={{ width: `${progress.total ? Math.round(progress.transferred / progress.total * 100) : 0}%` }} />
            </div>
            <span>{formatSize(progress.transferred)} / {formatSize(progress.total)}</span>
          </div>
        )}
      </div>
      {error && ready && <div className="sftp-error">{error}</div>}
    </div>
  )
}

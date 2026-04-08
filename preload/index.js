const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  db: {
    init: (password) => ipcRenderer.invoke('db:init', password),
    exists: () => ipcRenderer.invoke('db:exists')
  },

  sessions: {
    getAll: () => ipcRenderer.invoke('sessions:getAll'),
    get: (id) => ipcRenderer.invoke('sessions:get', id),
    getGroups: () => ipcRenderer.invoke('sessions:getGroups'),
    add: (session) => ipcRenderer.invoke('sessions:add', session),
    update: (session) => ipcRenderer.invoke('sessions:update', session),
    delete: (id) => ipcRenderer.invoke('sessions:delete', id)
  },

  credentials: {
    getAll: () => ipcRenderer.invoke('credentials:getAll'),
    get: (id) => ipcRenderer.invoke('credentials:get', id),
    add: (cred) => ipcRenderer.invoke('credentials:add', cred),
    update: (cred) => ipcRenderer.invoke('credentials:update', cred),
    delete: (id) => ipcRenderer.invoke('credentials:delete', id)
  },

  folders: {
    getAll: () => ipcRenderer.invoke('folders:getAll'),
    add: (folder) => ipcRenderer.invoke('folders:add', folder),
    update: (folder) => ipcRenderer.invoke('folders:update', folder),
    delete: (id) => ipcRenderer.invoke('folders:delete', id)
  },

  moveItem: (type, itemId, targetFolderId, sortOrder) =>
    ipcRenderer.invoke('moveItem', type, itemId, targetFolderId, sortOrder),

  ssh: {
    connect: (tabId, sessionId) => ipcRenderer.invoke('ssh:connect', tabId, sessionId),
    shell: (tabId) => ipcRenderer.invoke('ssh:shell', tabId),
    write: (tabId, data) => ipcRenderer.invoke(`ssh:write:${tabId}`, data),
    resize: (tabId, cols, rows) => ipcRenderer.invoke(`ssh:resize:${tabId}`, cols, rows),
    disconnect: (tabId) => ipcRenderer.invoke('ssh:disconnect', tabId),
    onData: (callback) => {
      const handler = (_event, tabId, data) => callback(tabId, data)
      ipcRenderer.on('ssh:data', handler)
      return () => ipcRenderer.removeListener('ssh:data', handler)
    },
    onDisconnected: (callback) => {
      const handler = (_event, tabId) => callback(tabId)
      ipcRenderer.on('ssh:disconnected', handler)
      return () => ipcRenderer.removeListener('ssh:disconnected', handler)
    },
    onClosed: (callback) => {
      const handler = (_event, tabId) => callback(tabId)
      ipcRenderer.on('ssh:closed', handler)
      return () => ipcRenderer.removeListener('ssh:closed', handler)
    }
  },

  sftp: {
    init: (tabId) => ipcRenderer.invoke('sftp:init', tabId),
    list: (tabId, path) => ipcRenderer.invoke('sftp:list', tabId, path),
    pwd: (tabId) => ipcRenderer.invoke('sftp:pwd', tabId),
    stat: (tabId, path) => ipcRenderer.invoke('sftp:stat', tabId, path),
    download: (tabId, remote, local) => ipcRenderer.invoke('sftp:download', tabId, remote, local),
    upload: (tabId, local, remote) => ipcRenderer.invoke('sftp:upload', tabId, local, remote),
    mkdir: (tabId, path) => ipcRenderer.invoke('sftp:mkdir', tabId, path),
    close: (tabId) => ipcRenderer.invoke('sftp:close', tabId),
    onProgress: (callback) => {
      const handler = (_event, tabId, progress) => callback(tabId, progress)
      ipcRenderer.on('sftp:progress', handler)
      return () => ipcRenderer.removeListener('sftp:progress', handler)
    }
  },

  showError: (message, stack) => ipcRenderer.invoke('show-error', { message, stack }),

  openCredentialsWindow: () => ipcRenderer.invoke('open-credentials-window')
})

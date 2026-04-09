const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { deriveKey, encrypt, decrypt, generateSalt } = require('./crypto')

const DB_PATH = path.join(__dirname, '..', 'sessions.db')

let db = null
let cryptoKey = null

async function init(masterPassword) {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      password_encrypted TEXT,
      private_key_path TEXT DEFAULT '',
      folder_id INTEGER,
      tags TEXT DEFAULT '[]',
      credential_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      password_encrypted TEXT,
      private_key_path TEXT DEFAULT '',
      use_default_key INTEGER DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value BLOB
    );
  `)

  try { db.run('ALTER TABLE sessions ADD COLUMN folder_id INTEGER') } catch {}
  try { db.run('ALTER TABLE sessions ADD COLUMN sort_order INTEGER DEFAULT 0') } catch {}
  try { db.run('ALTER TABLE sessions ADD COLUMN credential_id INTEGER') } catch {}
  try { db.run('ALTER TABLE credentials ADD COLUMN use_default_key INTEGER DEFAULT 0') } catch {}

  migrateGroupsToFolders()

  const saltRows = execGet("SELECT value FROM meta WHERE key = 'salt'")

  if (saltRows && saltRows.value) {
    const salt = saltRows.value
    cryptoKey = deriveKey(masterPassword, Buffer.from(salt))

    const testRow = execGet("SELECT password_encrypted FROM sessions WHERE password_encrypted IS NOT NULL AND password_encrypted != ''")
    if (testRow && testRow.password_encrypted) {
      try {
        decrypt(testRow.password_encrypted, cryptoKey)
      } catch {
        cryptoKey = null
        throw new Error('Неверный мастер-пароль')
      }
    }
  } else {
    const salt = generateSalt()
    db.run("INSERT INTO meta (key, value) VALUES ('salt', ?)", [salt])
    cryptoKey = deriveKey(masterPassword, salt)
  }

  save()
  return true
}

function migrateGroupsToFolders() {
  try {
    const cols = execAll("PRAGMA table_info(sessions)")
    const hasGroup = cols.some(c => c.name === 'group_name')
    if (!hasGroup) return

    const groups = execAll("SELECT DISTINCT group_name FROM sessions WHERE group_name != '' ORDER BY group_name")
    const folderMap = {}

    for (const g of groups) {
      db.run('INSERT INTO folders (name, parent_id) VALUES (?, NULL)', [g.group_name])
      const row = execGet('SELECT last_insert_rowid() as id')
      folderMap[g.group_name] = row.id
    }

    for (const [name, fid] of Object.entries(folderMap)) {
      db.run('UPDATE sessions SET folder_id = ? WHERE group_name = ?', [fid, name])
    }

    try { db.run('ALTER TABLE sessions DROP COLUMN group_name') } catch {}
  } catch {}
}

function fixTypes(row) {
  if (!row) return row
  const out = {}
  for (const key of Object.keys(row)) {
    out[key] = typeof row[key] === 'bigint' ? Number(row[key]) : row[key]
  }
  return out
}

function execGet(sql, params) {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  let result = null
  if (stmt.step()) {
    result = fixTypes(stmt.getAsObject())
  }
  stmt.free()
  return result
}

function execAll(sql, params) {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(fixTypes(stmt.getAsObject()))
  }
  stmt.free()
  return results
}

function save() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

function encryptField(text) {
  return encrypt(text, cryptoKey)
}

function decryptField(ciphertext) {
  try {
    return decrypt(ciphertext, cryptoKey)
  } catch {
    return ''
  }
}

function resolveDefaultSshKey() {
  const sshDir = path.join(os.homedir(), '.ssh')
  const candidates = ['id_ed25519', 'id_rsa', 'id_ecdsa', 'id_dsa']
  for (const name of candidates) {
    const p = path.join(sshDir, name)
    if (fs.existsSync(p)) return p
  }
  return ''
}

// --- Sessions ---

function getAllSessions() {
  return execAll('SELECT * FROM sessions ORDER BY sort_order, name').map(row => ({
    ...row,
    password: row.password_encrypted ? decryptField(row.password_encrypted) : '',
    tags: JSON.parse(row.tags || '[]')
  }))
}

function getSession(id) {
  const row = execGet('SELECT * FROM sessions WHERE id = ?', [id])
  if (!row) return null

  const session = {
    ...row,
    password: row.password_encrypted ? decryptField(row.password_encrypted) : '',
    tags: JSON.parse(row.tags || '[]')
  }

  if (row.credential_id) {
    const cred = getCredential(row.credential_id)
    if (cred) {
      session.username = cred.username
      session.password = cred.password
      session.private_key_path = cred.use_default_key ? resolveDefaultSshKey() : cred.private_key_path
    }
  }

  return session
}

function addSession(session) {
  const tagsJson = JSON.stringify(session.tags || [])
  const folderId = session.folder_id || null
  const sortOrder = session.sort_order || 0

  if (session.credential_id) {
    db.run(
      'INSERT INTO sessions (name, host, port, username, password_encrypted, private_key_path, folder_id, tags, credential_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [session.name, session.host, session.port, '', '', '', folderId, tagsJson, session.credential_id, sortOrder]
    )
  } else {
    const passwordEnc = session.password ? encryptField(session.password) : ''
    db.run(
      'INSERT INTO sessions (name, host, port, username, password_encrypted, private_key_path, folder_id, tags, credential_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [session.name, session.host, session.port, session.username, passwordEnc, session.private_key_path || '', folderId, tagsJson, null, sortOrder]
    )
  }
  save()
  return db.getRowsModified()
}

function updateSession(session) {
  const tagsJson = JSON.stringify(session.tags || [])
  const folderId = session.folder_id || null
  const sortOrder = session.sort_order || 0

  if (session.credential_id) {
    db.run(
      'UPDATE sessions SET name=?, host=?, port=?, username=?, password_encrypted=?, private_key_path=?, folder_id=?, tags=?, credential_id=?, sort_order=? WHERE id=?',
      [session.name, session.host, session.port, '', '', '', folderId, tagsJson, session.credential_id, sortOrder, session.id]
    )
  } else {
    const passwordEnc = session.password ? encryptField(session.password) : ''
    db.run(
      'UPDATE sessions SET name=?, host=?, port=?, username=?, password_encrypted=?, private_key_path=?, folder_id=?, tags=?, credential_id=?, sort_order=? WHERE id=?',
      [session.name, session.host, session.port, session.username, passwordEnc, session.private_key_path || '', folderId, tagsJson, null, sortOrder, session.id]
    )
  }
  save()
}

function deleteSession(id) {
  db.run('DELETE FROM sessions WHERE id = ?', [id])
  save()
}

// --- Folders ---

function getAllFolders() {
  return execAll('SELECT * FROM folders ORDER BY sort_order, name')
}

function addFolder(folder) {
  const parentId = folder.parent_id || null
  const sortOrder = folder.sort_order || 0
  db.run('INSERT INTO folders (name, parent_id, sort_order) VALUES (?, ?, ?)', [folder.name, parentId, sortOrder])
  save()
  const row = execGet('SELECT last_insert_rowid() as id')
  return row ? row.id : null
}

function updateFolder(folder) {
  const parentId = folder.parent_id || null
  const sortOrder = folder.sort_order || 0
  db.run('UPDATE folders SET name=?, parent_id=?, sort_order=? WHERE id=?', [folder.name, parentId, sortOrder, folder.id])
  save()
}

function deleteFolder(id) {
  db.run('UPDATE sessions SET folder_id = NULL WHERE folder_id = ?', [id])
  const children = execAll('SELECT id FROM folders WHERE parent_id = ?', [id])
  for (const child of children) {
    deleteFolder(child.id)
  }
  db.run('DELETE FROM folders WHERE id = ?', [id])
  save()
}

function moveItem(type, itemId, targetFolderId, sortOrder) {
  const folderId = targetFolderId || null
  const order = sortOrder || 0
  if (type === 'folder') {
    if (Number(itemId) === Number(targetFolderId)) return
    const children = getDescendantFolderIds(Number(itemId))
    if (children.includes(Number(targetFolderId))) return
    db.run('UPDATE folders SET parent_id=?, sort_order=? WHERE id=?', [folderId, order, itemId])
  } else {
    db.run('UPDATE sessions SET folder_id=?, sort_order=? WHERE id=?', [folderId, order, itemId])
  }
  save()
}

function getDescendantFolderIds(folderId) {
  const result = []
  const children = execAll('SELECT id FROM folders WHERE parent_id = ?', [folderId])
  for (const c of children) {
    result.push(Number(c.id))
    result.push(...getDescendantFolderIds(Number(c.id)))
  }
  return result
}

// --- Credentials ---

function ensureCredentialsTable() {
  if (!db) return
  try { db.run('ALTER TABLE sessions ADD COLUMN credential_id INTEGER') } catch {}
}

function getAllCredentials() {
  ensureCredentialsTable()
  return execAll('SELECT * FROM credentials ORDER BY name').map(row => ({
    ...row,
    password: row.password_encrypted ? decryptField(row.password_encrypted) : '',
    use_default_key: !!row.use_default_key
  }))
}

function getCredential(id) {
  const row = execGet('SELECT * FROM credentials WHERE id = ?', [id])
  if (!row) return null
  return {
    ...row,
    password: row.password_encrypted ? decryptField(row.password_encrypted) : '',
    use_default_key: !!row.use_default_key
  }
}

function addCredential(cred) {
  const passwordEnc = cred.password ? encryptField(cred.password) : ''
  const useDefaultKey = cred.use_default_key ? 1 : 0
  const keyPath = useDefaultKey ? '' : (cred.private_key_path || '')
  db.run(
    'INSERT INTO credentials (name, username, password_encrypted, private_key_path, use_default_key) VALUES (?, ?, ?, ?, ?)',
    [cred.name, cred.username, passwordEnc, keyPath, useDefaultKey]
  )
  save()
  return db.getRowsModified()
}

function updateCredential(cred) {
  const passwordEnc = cred.password ? encryptField(cred.password) : ''
  const useDefaultKey = cred.use_default_key ? 1 : 0
  const keyPath = useDefaultKey ? '' : (cred.private_key_path || '')
  db.run(
    'UPDATE credentials SET name=?, username=?, password_encrypted=?, private_key_path=?, use_default_key=? WHERE id=?',
    [cred.name, cred.username, passwordEnc, keyPath, useDefaultKey, cred.id]
  )
  save()
}

function deleteCredential(id) {
  db.run('UPDATE sessions SET credential_id = NULL WHERE credential_id = ?', [id])
  db.run('DELETE FROM credentials WHERE id = ?', [id])
  save()
}

// --- Lifecycle ---

function close() {
  if (db) {
    save()
    db.close()
    db = null
  }
}

function dbExists() {
  return fs.existsSync(DB_PATH)
}

function getSetting(key, defaultValue) {
  const row = execGet("SELECT value FROM meta WHERE key = ?", ['setting_' + key])
  if (row && row.value != null) {
    try { return JSON.parse(row.value) } catch { return row.value }
  }
  return defaultValue
}

function setSetting(key, value) {
  const val = JSON.stringify(value)
  db.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ['setting_' + key, val])
  save()
}

module.exports = {
  init, getAllSessions, getSession, addSession, updateSession, deleteSession,
  getAllFolders, addFolder, updateFolder, deleteFolder, moveItem,
  getAllCredentials, getCredential, addCredential, updateCredential, deleteCredential,
  close, dbExists, getSetting, setSetting
}

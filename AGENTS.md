# AGENTS.md — SSH Manager

## Stack

Electron + React 18 + Vite 5 (electron-vite 2.3). UI language: **Russian**.
Database: **sql.js** (pure JS SQLite, no native compilation). SSH: **ssh2**. Terminal: **@xterm/xterm**.

## Commands

```bash
npm run dev          # dev server + Electron
npm run build        # production build to out/
npm run preview      # run from built out/
```

No tests, no linter, no typecheck configured.

## Architecture

Three-layer Electron app:

- **`main/`** — Node.js main process (CJS). Entry: `main/index.js`.
  - `database.js` — sql.js SQLite wrapper, all CRUD, crypto field encryption
  - `crypto.js` — AES-256-GCM via Node.js `crypto`
  - `ipc/*.js` — IPC handlers for each domain (sessions, ssh, sftp, credentials, folders)
- **`preload/index.js`** — `contextBridge` API exposed as `window.api`
- **`src/`** — React renderer (ESM). Entry: `src/main.jsx`.
  - Routes by `?window=` query param: main app vs credentials window

### Key patterns

- **TabId architecture**: each open tab is a separate SSH connection keyed by `tabId` (not `sessionId`). Multiple tabs can connect to the same server.
- **Tabs never unmount**: hidden via `display: none` to preserve terminal state.
- **Credentials window**: separate `BrowserWindow` loading same renderer with `?window=credentials`.
- **Encrypted fields**: `password_encrypted` stored as AES-256-GCM ciphertext. Master password entered at startup derives the key.
- **Folders tree**: `folders` table with `parent_id` for nesting, sessions have `folder_id`. Drag&drop moves items via `moveItem` IPC.

## Build gotchas

- **vite ^6 is incompatible with electron-vite ^2.3** — must use vite ^5.
- **`externalizeDepsPlugin`** does not bundle local `require()` calls — every main-process entry must be listed in `rollupOptions.input`.
- **sql.js excluded from externalization** (it's pure JS, needs bundling): `exclude: ['sql.js']` in plugin config.

## Database gotchas

- **sql.js `getAsObject()` returns `BigInt`** for INTEGER columns — `fixTypes()` in `database.js` converts to `Number`. Without this, `WHERE id = ?` breaks.
- **Schema changes require DB deletion** or explicit `ALTER TABLE ADD COLUMN` migrations. `CREATE TABLE IF NOT EXISTS` won't alter existing tables. DB file location: `out/sessions.db`.
- After schema changes, delete `out/sessions.db` for a clean start.

## Environment

- **Corporate proxy**: `http://proxy.aso.rt.local:8080`. Electron install needed `--ignore-scripts` + npmmirror mirror.
- **No Visual Studio** on machine — native npm modules won't compile. Use pure-JS alternatives only.
- **Platform**: Windows. SSH key default path: `%USERPROFILE%\.ssh\`.

## CSS

Single file: `src/styles/global.css`. No CSS modules, no Tailwind.

## Preload API surface

`window.api` exposes: `db`, `sessions`, `credentials`, `folders`, `moveItem`, `ssh`, `sftp`, `showError`, `openCredentialsWindow`.
SSH data channel: `ssh:onData` / `ssh:onDisconnected` / `ssh:onClosed` via `ipcRenderer.on`.
Per-tab dynamic handlers: `ssh:write:${tabId}`, `ssh:resize:${tabId}` — must be cleaned up on disconnect.

# ConnectManager

SSH-менеджер с графическим интерфейсом на Electron + React.

![Electron](https://img.shields.io/badge/Electron-33-47848C?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)

## Возможности

- **SSH-терминал** — подключение через xterm.js, несколько вкладок на один сервер
- **SFTP** — файловый менеджер поверх SSH-соединения
- **Дерево папок** — организация сессий в папки с drag&drop
- **Профили кредов** — отдельные профили с логином/паролём/SSH-ключом
- **Шифрование** — пароли хранятся как AES-256-GCM шифротекст, мастер-пароль при запуске
- **SSH-ключ по умолчанию** — автоматическое использование `~/.ssh/id_ed25519` (или `id_rsa`, `id_ecdsa`, `id_dsa`)

## Стек

| Слой | Технология |
|------|-----------|
| Main process | Node.js (CJS), Electron |
| Renderer | React 18, Vite 5 |
| База данных | sql.js (SQLite в чистом JS) |
| SSH | ssh2 |
| Терминал | @xterm/xterm |
| Сборка | electron-vite 2.3 |

## Установка

```bash
npm install
```

Для установки Electron через корпоративный прокси:

```bash
npm install --ignore-scripts
ELECTRON_GET_USE_PROXY=true npm rebuild electron
```

## Запуск

```bash
npm run dev        # dev-сервер + Electron
npm run build      # production-сборка в out/
npm run preview    # запуск из out/
```

## Архитектура

```
main/              # Node.js main process
  index.js         # Создание окон, lifecycle
  database.js      # sql.js: CRUD, шифрование, миграции
  crypto.js        # AES-256-GCM
  ipc/             # IPC-хэндлеры (sessions, ssh, sftp, credentials, folders)
preload/
  index.js         # contextBridge → window.api
src/               # React renderer
  App.jsx          # Главное окно
  components/
    SessionPanel.jsx     # Дерево папок + сессии + drag&drop
    SessionDialog.jsx    # Форма сессии
    CredentialsDialog.jsx
    CredentialsWindow.jsx
    TerminalTab.jsx      # xterm.js терминал
    SftpPanel.jsx
    TabBar.jsx
    MasterPassword.jsx
```

### Ключевые решения

- **TabId** — каждая вкладка = отдельное SSH-соединение. Можно несколько вкладок на один сервер.
- **Вкладки не размонтируются** — скрытие через `display: none` для сохранения состояния терминала.
- **Креды в отдельном окне** — `BrowserWindow` с `?window=credentials`.
- **Чистый JS** — нет нативных зависимостей (sql.js вместо better-sqlite3), работает без Visual Studio.

## Требования

- Node.js 18+
- Windows (тестировалось на Windows с корпоративным прокси)

## Лицензия

MIT

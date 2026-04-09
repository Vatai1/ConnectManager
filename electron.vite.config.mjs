import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({
      exclude: ['sql.js']
    })],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'main/index.js'),
          database: resolve(__dirname, 'main/database.js'),
          crypto: resolve(__dirname, 'main/crypto.js'),
          'ipc/sessions': resolve(__dirname, 'main/ipc/sessions.js'),
          'ipc/ssh': resolve(__dirname, 'main/ipc/ssh.js'),
          'ipc/sftp': resolve(__dirname, 'main/ipc/sftp.js'),
          'ipc/credentials': resolve(__dirname, 'main/ipc/credentials.js'),
          'ipc/folders': resolve(__dirname, 'main/ipc/folders.js'),
          'ipc/settings': resolve(__dirname, 'main/ipc/settings.js'),
          theme: resolve(__dirname, 'main/theme.js')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: resolve(__dirname, 'preload/index.js') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src', 'index.html') }
      }
    },
    plugins: [react()]
  }
})

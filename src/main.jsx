import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import CredentialsWindow from './components/CredentialsWindow'
import SettingsWindow from './components/SettingsWindow'
import './styles/global.css'

const params = new URLSearchParams(window.location.search)
const windowType = params.get('window')

const Window = windowType === 'credentials' ? CredentialsWindow
  : windowType === 'settings' ? SettingsWindow
  : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Window />
  </React.StrictMode>
)

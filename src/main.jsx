import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import CredentialsWindow from './components/CredentialsWindow'
import './styles/global.css'

const params = new URLSearchParams(window.location.search)
const windowType = params.get('window')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {windowType === 'credentials' ? <CredentialsWindow /> : <App />}
  </React.StrictMode>
)

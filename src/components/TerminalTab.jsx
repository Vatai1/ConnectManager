import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const api = window.api

export default function TerminalTab({ tabId }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !tabId) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    setTimeout(() => fitAddon.fit(), 50)

    termRef.current = term

    const unsubData = api.ssh.onData((tid, data) => {
      if (tid === tabId) {
        term.write(data)
      }
    })

    const unsubClosed = api.ssh.onClosed((tid) => {
      if (tid === tabId) {
        term.writeln('\r\n\x1b[33m--- Соединение закрыто ---\x1b[0m')
      }
    })

    const disposable = term.onData((data) => {
      api.ssh.write(tabId, data).catch(() => {})
    })

    term.onResize(({ cols, rows }) => {
      api.ssh.resize(tabId, cols, rows).catch(() => {})
    })

    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit() } catch {}
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      disposable.dispose()
      unsubData()
      unsubClosed()
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
    }
  }, [tabId])

  return (
    <div className="terminal-container">
      <div ref={containerRef} className="terminal-element" />
    </div>
  )
}

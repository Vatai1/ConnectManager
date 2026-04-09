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
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#e6edf3',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79b8ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff'
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

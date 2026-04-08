import React, { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, stack: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message, stack: error.stack }
  }

  handleCopy = () => {
    navigator.clipboard.writeText(this.state.stack || this.state.error)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Произошла ошибка</h2>
            <p className="error-message">{this.state.error}</p>
            <pre className="error-stack">{this.state.stack}</pre>
            <div className="error-actions">
              <button onClick={this.handleCopy} className="btn btn-primary">
                {this.state.copied ? 'Скопировано!' : 'Копировать ошибку'}
              </button>
              <button onClick={() => this.setState({ hasError: false })} className="btn">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

import React from 'react'

// Catches render/lifecycle errors in whatever it wraps and shows a friendly
// fallback instead of letting the crash unmount the whole app to a blank
// white screen. Give it a `key` tied to something like the current screen id
// so navigating away and back remounts it and clears the error.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 48,
          textAlign: 'center',
          minHeight: 320,
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>
            {this.props.label ? `Something went wrong loading ${this.props.label}` : 'Something went wrong'}
          </div>
          <div style={{ fontSize: 14, color: '#767676', maxWidth: 420 }}>
            This section hit an unexpected error. The rest of the app should still work —
            try another page from the sidebar, or reload if the problem continues.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#1A1A1A',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

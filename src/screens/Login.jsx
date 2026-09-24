import React, { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 8,
  border: '1px solid var(--border2)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'var(--ink)',
  background: 'var(--sand)',
  outline: 'none',
  marginBottom: 12,
  boxSizing: 'border-box',
}

export function LoginScreen({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [signedUp, setSignedUp] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password)
      } else {
        await onSignUp(email.trim(), password, name.trim())
        setSignedUp(true)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--sand)', fontFamily: 'var(--font-body)', padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '36px 36px 30px',
        maxWidth: 380, width: '100%', boxShadow: 'var(--shadow2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold2)', marginBottom: 2 }}>Karma CRM</div>
          <div style={{ fontSize: 10, color: 'var(--ink3)', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Member Relations</div>
        </div>

        {signedUp ? (
          <div style={{ textAlign: 'center' }}>
            <i className="ti ti-mail-check" style={{ fontSize: 36, color: 'var(--palm)', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 16 }}>
              Account created. If your project requires email confirmation, check your inbox — otherwise you can sign in now.
            </p>
            <button
              onClick={() => { setSignedUp(false); setMode('signin'); setPassword('') }}
              style={{ ...inputStyle, marginBottom: 0, background: 'var(--ocean)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--sand)', borderRadius: 8, padding: 3 }}>
              {['signin', 'signup'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null) }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                    background: mode === m ? 'white' : 'transparent',
                    color: mode === m ? 'var(--ink)' : 'var(--ink3)',
                    boxShadow: mode === m ? 'var(--shadow)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={inputStyle}
                  required
                />
              )}
              <input
                type="email"
                placeholder="you@karma.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                minLength={6}
                required
              />

              {mode === 'signup' && (
                <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
                  Only @karma.com email addresses can create an account.
                </p>
              )}

              {error && (
                <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--rose)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                  background: 'var(--ocean)', color: 'white', fontFamily: 'var(--font-body)',
                  fontSize: 13, fontWeight: 500, cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.65 : 1,
                }}
              >
                {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

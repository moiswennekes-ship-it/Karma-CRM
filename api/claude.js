// Server-side proxy to the Anthropic API.
// Only signed-in Karma CRM users can use it: the request must carry the
// user's Supabase access token, which we verify with Supabase before
// forwarding anything. The model and token limit are fixed here, so the
// endpoint can't be used as a general-purpose Claude proxy.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY

// Preferred model first; falls back if the account can't use it.
const MODELS = [process.env.ANTHROPIC_MODEL, 'claude-sonnet-5-5', 'claude-sonnet-4-5'].filter(Boolean)
const MAX_TOKENS_CAP = 2000

async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    })
    if (!r.ok) return null
    const user = await r.json()
    return user && user.id ? user : null
  } catch (e) {
    return null
  }
}

async function callAnthropic(model, body) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...body, model }),
  })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

  const user = await verifyUser(req.headers.authorization)
  if (!user) return res.status(401).json({ error: { message: 'Please sign in again to use the AI.' } })

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: { message: 'AI key is not configured on the server.' } })

  const { messages, system, max_tokens } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'No message to send.' } })
  }

  const body = {
    messages,
    max_tokens: Math.min(Number(max_tokens) || 900, MAX_TOKENS_CAP),
  }
  if (typeof system === 'string' && system) body.system = system

  try {
    let response
    for (const model of MODELS) {
      response = await callAnthropic(model, body)
      // Only try the next model when this one isn't available to the account
      if (response.status !== 404 && response.status !== 400) break
      const peek = await response.clone().json().catch(() => ({}))
      const msg = (peek.error && peek.error.message) || ''
      if (!/model/i.test(msg)) break
    }
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (e) {
    return res.status(502).json({ error: { message: 'Could not reach the AI service. Try again in a moment.' } })
  }
}

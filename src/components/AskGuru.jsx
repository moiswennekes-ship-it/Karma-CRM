import React, { useState, useRef, useEffect } from 'react'
import { Btn } from './UI'
import { callClaude, GURU_RULES } from '../lib/claude'
import { loadBrain, brainContext, saveLesson, clearBrainCache } from '../lib/brain'
import { saveAIMessage } from '../lib/supabase'
import { daysUntilDeparture, parseKarmaDate } from '../lib/dates'

// Light formatting for Guru's answers: **bold**, > quotes, bullets, headings.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )
}
export function FormattedText({ text }) {
  const lines = (text || '').split('\n')
  return lines.map((raw, i) => {
    const line = raw.trimEnd()
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />
    if (/^#{1,4}\s/.test(line)) return <div key={i} style={{ fontWeight: 600, marginTop: 4 }}>{inline(line.replace(/^#{1,4}\s/, ''))}</div>
    if (/^>\s?/.test(line)) return <div key={i} style={{ borderLeft: '3px solid var(--ocean2)', background: 'var(--ocean-light)', padding: '4px 8px', margin: '2px 0', borderRadius: 4 }}>{inline(line.replace(/^>\s?/, ''))}</div>
    if (/^\s*[-*•]\s/.test(line)) return <div key={i} style={{ display: 'flex', gap: 6, paddingLeft: 4 }}><span>•</span><span>{inline(line.replace(/^\s*[-*•]\s/, ''))}</span></div>
    if (/^\s*\d+\.\s/.test(line)) return <div key={i} style={{ paddingLeft: 4 }}>{inline(line.trim())}</div>
    return <div key={i}>{inline(line)}</div>
  })
}

const GUEST_CHIPS = [
  "What's my next move with this guest?",
  'Write a WhatsApp for them',
  'Prep me for their tour',
  'Which product fits them best, if any?',
]
const GENERAL_CHIPS = [
  "I'm with a guest right now, help me",
  "I'm stuck on an objection",
  'Who should I focus on today?',
  'Brainstorm an opener for a points member',
]

export function guestContext(guest, activity = []) {
  if (!guest) return ''
  const days = daysUntilDeparture(guest.depart_date)
  const arr = parseKarmaDate(guest.arrival_date)
  const today = new Date(); today.setHours(23, 59, 59, 0)
  const toArrival = arr ? Math.round((new Date(arr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000) : null
  const stayStatus = arr && arr > today
    ? `NOT ARRIVED YET: arrives in ${toArrival} day${toArrival === 1 ? '' : 's'}`
    : days !== null && days >= 0 ? `IN HOUSE: ${days} day${days === 1 ? '' : 's'} until departure` : 'departed'
  const recent = activity.slice(0, 12).map(a =>
    `- ${new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${a.type}): ${a.content}`
  ).join('\n')
  return `GUEST YOU'RE ADVISING ON:
Name: ${guest.name}
Member type: ${guest.member_type || '—'} | Membership: ${guest.membership || '—'}${guest.member_number ? ` | Member #${guest.member_number}` : ''}
Stay: ${guest.arrival_date || '?'} → ${guest.depart_date || '?'}${guest.nights ? `, ${guest.nights} nights` : ''} (${stayStatus})
Room: ${guest.room || '—'} | Nationality: ${guest.nationality || '—'} | Linked stay: ${guest.linked_stay || 'no'}
Pipeline stage: ${guest.status}${guest.outcome ? ` | Outcome: ${guest.outcome}${guest.outcome_reason ? ` (${guest.outcome_reason})` : ''}` : ''}
Key notes: ${guest.notes || '—'}
Recent activity:
${recent || '- none logged'}`
}

// Chat with the guru. With a guest it's grounded in that guest's file;
// without one it's a general sales coach. `extraContext` lets the
// caller add things like today's pipeline.
export function AskGuru({ guest, activity = [], extraContext = '', compact = false, onLogged }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState({})
  const endRef = useRef(null)

  useEffect(() => { setMessages([]); setError(null); setSaved({}) }, [guest?.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, loading])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    setError(null)
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setLoading(true)
    try {
      const brain = await loadBrain()
      const system = [
        GURU_RULES,
        'You are Guru, Mois\'s AI sales coach. Be practical and specific: give the actual words to say or send, and one clear next step. Challenge Mois if his plan looks wrong. Keep answers short unless asked for detail.',
        brainContext(brain),
        guestContext(guest, activity),
        extraContext,
      ].filter(Boolean).join('\n\n')
      const answer = await callClaude(next.map(m => ({ role: m.role, content: m.content })), 1200, system)
      setMessages([...next, { role: 'assistant', content: answer }])
      if (guest?.id) {
        saveAIMessage({ guest_id: guest.id, message_type: 'ask_guru', prompt_used: q, output: answer, was_sent: false }).catch(() => {})
      }
    } catch (e) {
      setError(e.message || 'Guru could not answer. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function keepAsLesson(i) {
    const answer = messages[i]?.content
    const question = messages[i - 1]?.content
    if (!answer) return
    const note = window.prompt('Save what worked as a lesson (edit it short):', answer.slice(0, 280))
    if (!note) return
    try {
      await saveLesson({ kind: 'success', content: note, guest_id: guest?.id || null, source_question: question || null })
      clearBrainCache()
      setSaved(s => ({ ...s, [i]: true }))
      onLogged && onLogged()
    } catch (e) {
      setError('Could not save the lesson: ' + e.message)
    }
  }

  const chips = guest ? GUEST_CHIPS : GENERAL_CHIPS
  const firstName = guest?.name?.split(/\s|&/)[0]

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--ocean-light), var(--palm-light))',
      border: '1px solid rgba(26,95,110,.18)', borderRadius: 12, padding: compact ? 12 : 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 14 }} /> {guest ? `Ask Guru about ${firstName}` : 'Ask Guru'}
      </div>

      {messages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {chips.map(c => (
            <button key={c} onClick={() => send(c)} style={{
              border: '1px solid rgba(26,95,110,.25)', background: 'white', color: 'var(--ocean)',
              borderRadius: 16, padding: '5px 10px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>{c}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: compact ? 380 : 520, overflowY: 'auto', marginBottom: messages.length ? 10 : 0 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'stretch', maxWidth: m.role === 'user' ? '85%' : '100%' }}>
            <div style={{
              background: m.role === 'user' ? 'var(--ocean)' : 'white',
              color: m.role === 'user' ? 'white' : 'var(--ink2)',
              borderRadius: 10, padding: '9px 12px', fontSize: 12.5, lineHeight: 1.6,
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              whiteSpace: m.role === 'user' ? 'pre-wrap' : 'normal',
            }}>{m.role === 'user' ? m.content : <FormattedText text={m.content} />}</div>
            {m.role === 'assistant' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                <Btn variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(m.content).catch(() => {})}>
                  <i className="ti ti-copy" /> Copy
                </Btn>
                {guest?.whatsapp && (
                  <a href={`https://wa.me/${guest.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(m.content)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#25D366', color: 'white', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>
                    <i className="ti ti-brand-whatsapp" /> WhatsApp
                  </a>
                )}
                <Btn variant="ghost" size="sm" onClick={() => keepAsLesson(i)} disabled={saved[i]}>
                  <i className={`ti ti-${saved[i] ? 'check' : 'bulb'}`} /> {saved[i] ? 'Saved as lesson' : 'This worked'}
                </Btn>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink3)', fontSize: 12 }}>
            <div className="dot-pulse"><span /><span /><span /></div> Guru is thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 6 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={guest ? `Ask anything about ${firstName}...` : 'Ask Guru anything...'}
          rows={2}
          style={{
            flex: 1, border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 10px',
            fontFamily: 'var(--font-body)', fontSize: 12.5, resize: 'none', outline: 'none', background: 'white',
          }}
        />
        <Btn variant="ocean" onClick={() => send()} disabled={loading || !input.trim()}>
          <i className="ti ti-send" />
        </Btn>
      </div>
      {messages.length > 0 && (
        <button onClick={() => setMessages([])} style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
          Start over
        </button>
      )}
    </div>
  )
}

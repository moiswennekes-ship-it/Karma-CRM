import React, { useState } from 'react'
import { isToday, isLeavingSoon, hasLeft, daysUntilDeparture, isInHouse } from '../lib/dates'

export function MorningBriefing({ guests }) {
  const [expanded, setExpanded] = useState(false)
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)

  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const dateName = today.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })

  // Use real date comparisons
  const activeGuests = guests.filter(g => !hasLeft(g.depart_date))
  const arrivingToday = guests.filter(g => isToday(g.arrival_date))
  const inHouse = guests.filter(g => isInHouse(g.arrival_date, g.depart_date))
  const notContacted = activeGuests.filter(g => g.status === 'Arriving Soon')
  const followUps = activeGuests.filter(g => g.status === 'Follow-Up')
  const meetingsToday = activeGuests.filter(g => g.status === 'Meeting Booked')
  const hotLeads = activeGuests.filter(g => g.upgrade_score >= 75 && g.status !== 'Converted')
  const leavingSoon = inHouse.filter(g =>
    isLeavingSoon(g.depart_date, 2) && g.status !== 'Converted' && g.upgrade_score >= 50
  )
  const departed = guests.filter(g => hasLeft(g.depart_date))

  const totalActions = notContacted.length + followUps.length + leavingSoon.length

  async function generateBriefing() {
    setLoading(true)
    setBriefing('')
    
    const prompt = `You are a luxury resort member relations assistant. Generate a concise morning briefing for Mois Wennekes at Karma Kandara, Bali.

Today is ${dayName}, ${dateName}.

Current pipeline (active guests only — departed guests excluded):
- ${inHouse.length} guests currently in house
- ${arrivingToday.length} guests arriving today: ${arrivingToday.map(g => g.name).join(', ') || 'none'}
- ${notContacted.length} guests not yet contacted: ${notContacted.map(g => g.name).join(', ') || 'none'}
- ${followUps.length} guests needing follow-up: ${followUps.map(g => g.name).join(', ') || 'none'}
- ${meetingsToday.length} meetings booked: ${meetingsToday.map(g => g.name).join(', ') || 'none'}
- ${hotLeads.length} hot leads: ${hotLeads.map(g => `${g.name} (${g.upgrade_score}%)`).join(', ') || 'none'}
- ${leavingSoon.length} high-value guests leaving in 2 days or less: ${leavingSoon.map(g => `${g.name} (${daysUntilDeparture(g.depart_date)} days left)`).join(', ') || 'none'}
- ${departed.length} guests have already departed

Write a warm, direct morning briefing (3-4 short paragraphs, not bullet points).
- Start with a one-line summary of the day
- Name the 2-3 most important guests to prioritise and why
- Flag anyone leaving very soon who hasn't converted
- End with one motivating sentence

Keep it under 200 words. Sound like a knowledgeable colleague, not a robot.`

    try {
     const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('') || ''
      setBriefing(text)
    } catch (e) {
      setBriefing('AI briefing unavailable. Add your Anthropic API key in Vercel environment variables to enable this feature.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A3A4A, #1A5F6E)',
      borderRadius: 14, padding: '18px 20px', marginBottom: 16,
      boxShadow: '0 4px 20px rgba(26,95,110,.25)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 22 }}>🌅</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'white', lineHeight: 1.2 }}>
              {dayName} Briefing
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>
              {dateName} · {totalActions} action{totalActions !== 1 ? 's' : ''} today
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            [arrivingToday.length, 'Arriving', '🛬'],
            [notContacted.length, 'Contact', '💬'],
            [followUps.length, 'Follow-up', '🔔'],
            [hotLeads.length, 'Hot', '🔥'],
          ].map(([count, label, emoji]) => count > 0 && (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'white', lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}

          <button
            onClick={() => { setExpanded(!expanded); if (!expanded && !briefing) generateBriefing() }}
            style={{
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 8, padding: '7px 14px', color: 'white', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>
            <i className="ti ti-sparkles" style={{ fontSize: 13 }} />
            {expanded ? 'Close' : 'AI Briefing'}
          </button>
        </div>
      </div>

      {/* Priority actions — always visible */}
      {!expanded && totalActions > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {notContacted.slice(0, 3).map(g => (
            <div key={g.id} style={{
              background: 'rgba(255,255,255,.1)', borderRadius: 20,
              padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,.8)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD166', display: 'inline-block' }} />
              {g.name.split(' ')[0]} — contact
            </div>
          ))}
          {followUps.slice(0, 2).map(g => (
            <div key={g.id} style={{
              background: 'rgba(255,255,255,.1)', borderRadius: 20,
              padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,.8)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B6B', display: 'inline-block' }} />
              {g.name.split(' ')[0]} — follow up
            </div>
          ))}
          {leavingSoon.slice(0, 2).map(g => (
            <div key={g.id} style={{
              background: 'rgba(255,255,255,.1)', borderRadius: 20,
              padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,.8)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4444', display: 'inline-block' }} />
              {g.name.split(' ')[0]} — leaving soon!
            </div>
          ))}
        </div>
      )}

      {/* Expanded AI briefing */}
      {expanded && (
        <div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.6)', fontSize: 12, padding: '8px 0' }}>
              <div className="dot-pulse"><span style={{ background: 'white' }} /><span style={{ background: 'white' }} /><span style={{ background: 'white' }} /></div>
              Generating your briefing...
            </div>
          )}
          {briefing && (
            <>
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,.85)', lineHeight: 1.7,
                whiteSpace: 'pre-wrap', marginBottom: 14,
              }}>
                {briefing}
              </div>
              <button
                onClick={generateBriefing}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 6, padding: '5px 12px', color: 'rgba(255,255,255,.6)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                <i className="ti ti-refresh" style={{ marginRight: 4 }} />
                Regenerate
              </button>
            </>
          )}

          {/* Priority list */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {meetingsToday.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'white' }}>
                <span style={{ opacity: .6 }}>📅 Meetings today: </span>
                {meetingsToday.map(g => g.name).join(', ')}
              </div>
            )}
            {leavingSoon.length > 0 && (
              <div style={{ background: 'rgba(255,80,80,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#FFB3B3' }}>
                <span>⚠️ Closing window — leaving soon: </span>
                {leavingSoon.map(g => `${g.name} (${g.nights}n left)`).join(', ')}
              </div>
            )}
            {hotLeads.length > 0 && (
              <div style={{ background: 'rgba(255,209,102,.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#FFD166' }}>
                <span>🔥 Hot leads: </span>
                {hotLeads.map(g => `${g.name} (${g.upgrade_score}%)`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

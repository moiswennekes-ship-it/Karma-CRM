import React, { useState } from 'react'
import { GuestCard } from '../components/GuestCard'
import { ProfilePanel } from '../components/ProfilePanel'
import { ALL_STATUSES } from '../components/UI'
import { hasLeft } from '../lib/dates'

// GUESTS: search and filter everyone, including departed guests.
export function GuestsScreen({ guests, isMobile, onStatusChange, ...profileProps }) {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const [showDeparted, setShowDeparted] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const q = query.trim().toLowerCase()
  const filtered = guests.filter(g => {
    if (!showDeparted && hasLeft(g.depart_date) && g.status !== 'Converted') return false
    if (stage !== 'all' && g.status !== stage) return false
    if (!q) return true
    return [g.name, g.member_number, g.room, g.email, g.whatsapp, g.nationality, g.membership]
      .some(v => (v || '').toString().toLowerCase().includes(q))
  })
  const selected = guests.find(g => g.id === selectedId)

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 90px' : '16px 20px', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, room, member #, email..."
            style={{ flex: 1, minWidth: 200, border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'white', outline: 'none' }} />
          <select value={stage} onChange={e => setStage(e.target.value)}
            style={{ border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'white' }}>
            <option value="all">All stages</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)', marginBottom: 12 }}>
          <input type="checkbox" checked={showDeparted} onChange={e => setShowDeparted(e.target.checked)} /> Show departed guests
        </label>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 8 }}>{filtered.length} guests</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {filtered.map(g => <GuestCard key={g.id} guest={g} selected={selectedId === g.id} onClick={setSelectedId} onStatusChange={onStatusChange} />)}
        </div>
      </div>
      <ProfilePanel guest={selected} isMobile={isMobile} onClose={() => setSelectedId(null)} onStatusChange={onStatusChange} {...profileProps} />
    </div>
  )
}

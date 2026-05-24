import React, { useState } from 'react'
import { Avatar, StatusPill, Btn, AIOutputBox, FieldSelect, ALL_STATUSES } from './UI'
import { useAI } from '../hooks/useAI'

export function GuestProfile({ guest, onStatusChange, onSaveNotes, onDelete }) {
  const ai = useAI()
  const [notes, setNotes] = useState(guest ? (guest.notes || '') : '')
  const [lastAction, setLastAction] = useState(null)

  if (!guest) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--ink4)' }}>
        <i className="ti ti-user-circle" style={{ fontSize: 44, display: 'block', marginBottom: 12, opacity: .35 }} />
        <p style={{ fontSize: 12 }}>Select a guest to view their profile & AI insights</p>
      </div>
    )
  }

  const scoreColor = guest.upgrade_score > 70 ? 'var(--rose)' : guest.upgrade_score > 50 ? 'var(--amber)' : 'var(--ink3)'

  const insight = guest.upgrade_score >= 80
    ? `${guest.name.split(' ')[0]} is a prime conversion candidate — high maintenance burden with low usage. Lead with cost savings and equity over 10 years.`
    : guest.upgrade_score >= 60
    ? `Good opportunity. Address any past concerns first, then present the upgrade value proposition with specifics.`
    : guest.status === 'Fractional Owner'
    ? `Satisfied owner — focus on delivering an exceptional experience. Ask about friends or family who travel similarly.`
    : `Relationship-first approach. Learn their travel goals and stay curious. The upgrade conversation follows genuine connection.`

  const handleGen = async (fn, label) => {
    setLastAction(label)
    ai.clear()
    await fn()
  }

  const handleNoteSave = () => {
    onSaveNotes(guest.id, notes)
  }

  const handleDelete = () => {
    if (window.confirm(`Delete ${guest.name}? This cannot be undone.`)) {
      onDelete(guest.id)
    }
  }

  return (
    <div style={{ padding: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 16 }}>
        <Avatar initials={guest.initials} colorIndex={guest.color_index} size={50} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}>{guest.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{guest.member_type}</div>
        </div>
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          ['Membership', guest.membership],
          ['Stay', `${guest.arrival_date} → ${guest.depart_date}`],
          ['Party', guest.party],
          ['Last Stay', guest.last_stay],
          ['WhatsApp', guest.whatsapp],
          ['Email', guest.email],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{val || '—'}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 5 }}>Status</div>
        <FieldSelect
          value={guest.status}
          onChange={val => onStatusChange(guest.id, val)}
          options={ALL_STATUSES}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Upgrade score */}
      <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--sand)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>Upgrade potential</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: scoreColor }}>↑ {guest.upgrade_score}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--sand3)', borderRadius: 2 }}>
          <div style={{ width: `${guest.upgrade_score}%`, height: '100%', background: scoreColor, borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>

      {/* AI Insight */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ocean-light), var(--palm-light))',
        border: '1px solid rgba(26,95,110,.18)', borderRadius: 10, padding: 13, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 500, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7 }}>
          <i className="ti ti-sparkles" style={{ fontSize: 14 }} /> AI Opportunity Insight
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{insight}</p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 13 }}>
        <Btn variant="green" size="sm" style={{ justifyContent: 'center' }}
          onClick={() => handleGen(() => ai.welcomeWhatsApp(guest), 'whatsapp')}>
          <i className="ti ti-brand-whatsapp" /> WhatsApp
        </Btn>
        <Btn variant="ocean" size="sm" style={{ justifyContent: 'center' }}
          onClick={() => handleGen(() => ai.welcomeEmail(guest), 'email')}>
          <i className="ti ti-mail" /> Email
        </Btn>
        <Btn variant="amber" size="sm" style={{ justifyContent: 'center' }}
          onClick={() => handleGen(() => ai.meetingPrep(guest), 'meeting')}>
          <i className="ti ti-presentation" /> Meet Prep
        </Btn>
      </div>

      {/* AI output */}
      <AIOutputBox
        output={ai.output}
        loading={ai.loading}
        onCopy={() => {}}
        onRegenerate={lastAction ? () => {
          if (lastAction === 'whatsapp') ai.welcomeWhatsApp(guest)
          else if (lastAction === 'email') ai.welcomeEmail(guest)
          else if (lastAction === 'meeting') ai.meetingPrep(guest)
        } : null}
      />

      {/* Notes */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 6 }}>Quick Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes from your interaction..."
          style={{
            width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
            padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 12,
            color: 'var(--ink)', background: 'var(--sand)', resize: 'none', height: 70,
            lineHeight: 1.5, marginBottom: 8, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 7 }}>
          <Btn variant="ghost" size="sm" onClick={handleNoteSave} style={{ flex: 1, justifyContent: 'center' }}>
            <i className="ti ti-device-floppy" /> Save Notes
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => handleGen(() => ai.followUp(guest, notes), 'followup')}
            style={{ flex: 1, justifyContent: 'center' }}>
            <i className="ti ti-sparkles" /> AI Follow-Up
          </Btn>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <Btn variant="danger" size="sm" onClick={handleDelete} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="ti ti-trash" /> Delete Guest
          </Btn>
        </div>
      </div>
    </div>
  )
}

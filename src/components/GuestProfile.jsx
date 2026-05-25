import React, { useState } from 'react'
import { Avatar, Btn, AIOutputBox, FieldSelect, ALL_STATUSES } from './UI'
import { useAI } from '../hooks/useAI'
import { formatDaysLeft, hasLeft, isLeavingSoon } from '../lib/dates'

export function GuestProfile({ guest, onStatusChange, onSaveNotes, onDelete, onEdit }) {
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

  const departed = hasLeft(guest.depart_date)
  const leavingSoon = isLeavingSoon(guest.depart_date, 2)
  const daysLeft = formatDaysLeft(guest.depart_date)

  const insight = guest.member_type === 'Fractional Owner'
    ? `Existing fractional owner — focus on delivering an exceptional experience. High referral value. Ask about friends or family who travel similarly.`
    : guest.status === 'Hot Lead'
    ? `Strong conversion candidate. Lead with the financial comparison — what they're paying now versus what they could own. Book the meeting today.`
    : guest.status === 'Meeting Booked'
    ? `Meeting confirmed. Prepare the maintenance fee projection and fractional comparison. Address any past concerns proactively.`
    : guest.status === 'Follow-Up'
    ? `Warm lead — stay in touch. Don't lead with product, lead with the relationship and their experience here at Kandara.`
    : `Build the relationship first. Learn their travel goals, understand their membership history, then identify the right moment for the conversation.`

  const handleGen = async (fn, label) => {
    setLastAction(label)
    ai.clear()
    await fn()
  }

  const handleNoteSave = () => onSaveNotes(guest.id, notes)

  const handleDelete = () => {
    if (window.confirm(`Delete ${guest.name}? This cannot be undone.`)) {
      onDelete(guest.id)
    }
  }

  return (
    <div style={{ padding: 18 }}>

      {/* Departure alert */}
      {departed && (
        <div style={{ background: '#F0F0F0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-plane-departure" style={{ fontSize: 14 }} /> This guest has departed
        </div>
      )}
      {leavingSoon && !departed && (
        <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-clock" style={{ fontSize: 14 }} /> ⚠️ {daysLeft} — closing window!
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 16 }}>
        <Avatar initials={guest.initials} colorIndex={guest.color_index} size={50} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}>{guest.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{guest.member_type}</div>
          {guest.member_number && (
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 1 }}>Member #{guest.member_number}</div>
          )}
        </div>
      </div>

      {/* Key fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Membership', guest.membership],
          ['Stay', `${guest.arrival_date} → ${guest.depart_date}`],
          ['Nights', guest.nights ? `${guest.nights} nights` : '—'],
          ['Room', guest.room || '—'],
          ['Nationality', guest.nationality || '—'],
          ['Linked Stay', guest.linked_stay || 'No'],
          ['WhatsApp', guest.whatsapp || '—'],
          ['Email', guest.email || '—'],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-all' }}>{val}</div>
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

      {/* AI Insight */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ocean-light), var(--palm-light))',
        border: '1px solid rgba(26,95,110,.18)', borderRadius: 10, padding: 13, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 500, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 7 }}>
          <i className="ti ti-sparkles" style={{ fontSize: 14 }} /> AI Insight
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{insight}</p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 7 }}>
        <Btn variant="green" size="sm" style={{ justifyContent: 'center' }}
          onClick={() => handleGen(() => ai.welcomeWhatsApp(guest), 'whatsapp')}>
          <i className="ti ti-brand-whatsapp" /> Generate
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

      {/* WhatsApp send button */}
      {ai.output && lastAction === 'whatsapp' && guest.whatsapp && (
        <a
          href={`https://wa.me/${guest.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(ai.output)}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#25D366', color: 'white', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', marginBottom: 7,
          }}>
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} />
          Send to {guest.name.split(' ')[0]} on WhatsApp →
        </a>
      )}

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
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 6 }}>Notes</div>
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
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 7 }}>
          <Btn variant="ghost" size="sm" onClick={() => onEdit(guest)} style={{ flex: 1, justifyContent: 'center' }}>
            <i className="ti ti-pencil" /> Edit Guest
          </Btn>
          <Btn variant="danger" size="sm" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center' }}>
            <i className="ti ti-trash" /> Delete Guest
          </Btn>
        </div>
      </div>
    </div>
  )
}

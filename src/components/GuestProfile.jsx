import React, { useState, useEffect, useCallback } from 'react'
import { Avatar, Btn, FieldSelect, ALL_STATUSES } from './UI'
import { AskGuru } from './AskGuru'
import { formatDaysLeft, hasLeft, isLeavingSoon } from '../lib/dates'
import { nextAction } from '../lib/nextAction'
import { weekTag } from '../lib/history'
import { getInteractions, logInteraction } from '../lib/supabase'

const TYPE_ICON = {
  note: 'ti-notes', status_change: 'ti-arrows-exchange', outcome: 'ti-flag',
  whatsapp: 'ti-brand-whatsapp', email: 'ti-mail', meeting: 'ti-calendar',
}

export function GuestProfile({ guest, staffName, onStatusChange, onEditGuest, onDelete, onEdit }) {
  const [activity, setActivity] = useState([])
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [saving, setSaving] = useState(false)

  const loadActivity = useCallback(async () => {
    if (!guest?.id) return setActivity([])
    try { setActivity(await getInteractions(guest.id)) } catch { setActivity([]) }
  }, [guest?.id])

  useEffect(() => { loadActivity() }, [loadActivity, guest?.status])

  if (!guest) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--ink4)' }}>
        <i className="ti ti-user-circle" style={{ fontSize: 44, display: 'block', marginBottom: 12, opacity: .35 }} />
        <p style={{ fontSize: 12 }}>Select a guest to see their file and ask Guru</p>
      </div>
    )
  }

  const departed = hasLeft(guest.depart_date)
  const leavingSoon = isLeavingSoon(guest.depart_date, 2)
  const next = nextAction(guest)

  async function addNote() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await logInteraction({ guest_id: guest.id, type: noteType, content: note.trim(), staff_name: staffName || null })
      setNote('')
      await loadActivity()
    } catch (e) {
      window.alert('Could not save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(val) {
    if (val === 'Converted') {
      const why = window.prompt(`Nice! What made ${guest.name.split(/\s|&/)[0]} buy? (one line, helps Guru learn)`, '')
      await onEditGuest(guest.id, { status: val, outcome: 'won', outcome_reason: why || null })
      if (why) await logInteraction({ guest_id: guest.id, type: 'outcome', content: `Won: ${why}`, staff_name: staffName || null }).catch(() => {})
    } else {
      await onStatusChange(guest.id, val)
    }
    loadActivity()
  }

  async function markNoDeal() {
    const why = window.prompt('Why no deal? (price, timing, partner, not a fit...)', '')
    if (why === null) return
    await onEditGuest(guest.id, { outcome: 'lost', outcome_reason: why || null })
    await logInteraction({ guest_id: guest.id, type: 'outcome', content: `No deal: ${why || 'no reason given'}`, staff_name: staffName || null }).catch(() => {})
    loadActivity()
  }

  async function reopen() {
    await onEditGuest(guest.id, { outcome: null, outcome_reason: null })
    loadActivity()
  }

  const handleDelete = () => {
    if (window.confirm(`Delete ${guest.name}? This cannot be undone.`)) onDelete(guest.id)
  }

  return (
    <div style={{ padding: 18 }}>
      {departed && (
        <div style={{ background: '#F0F0F0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-plane-departure" style={{ fontSize: 14 }} /> This guest has departed
        </div>
      )}
      {leavingSoon && !departed && (
        <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-clock" style={{ fontSize: 14 }} /> {formatDaysLeft(guest.depart_date)}: closing window
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 14 }}>
        <Avatar initials={guest.initials} colorIndex={guest.color_index} size={50} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}>{guest.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{guest.member_type}</div>
          {guest.member_number && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 1 }}>Member #{guest.member_number}</div>}
        </div>
      </div>

      {/* Earlier stays (same member number) */}
      {guest._past?.length > 0 && (
        <div style={{ background: guest._stayKind === 'returning' ? '#F0EDFC' : 'var(--ocean-light)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: guest._stayKind === 'returning' ? '#5A3DB8' : 'var(--ocean)', marginBottom: 6 }}>
            <i className={`ti ti-${guest._stayKind === 'returning' ? 'refresh' : 'link'}`} /> {guest._stayKind === 'returning' ? `Returning guest · ${guest._past.length} earlier stay${guest._past.length > 1 ? 's' : ''}` : 'Continuing stay'}
          </div>
          {guest._past.slice(0, 4).map(p => (
            <div key={p.id} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}>
              <div style={{ fontWeight: 500 }}>{weekTag(p)} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>({p.arrival_date} → {p.depart_date}) · {p.status}{p.outcome === 'lost' ? ' · no deal' : p.outcome === 'won' ? ' · bought' : ''}</span></div>
              {p.outcome_reason && <div style={{ color: 'var(--ink2)' }}>Why: {p.outcome_reason}</div>}
              {p.notes && <div style={{ color: 'var(--ink2)' }}>{p.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Next best action */}
      {next && (
        <div style={{ background: 'var(--gold-light)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--amber)', marginBottom: 3 }}>Next best action</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{next.action}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{next.reason}</div>
        </div>
      )}
      {guest.outcome && (
        <div style={{ background: guest.outcome === 'won' ? 'var(--palm-light)' : '#F3F2EE', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 12 }}>
            <strong>{guest.outcome === 'won' ? 'Won' : 'No deal'}</strong>{guest.outcome_reason ? `: ${guest.outcome_reason}` : ''}
          </div>
          {guest.outcome === 'lost' && <Btn variant="ghost" size="sm" onClick={reopen}>Reopen</Btn>}
        </div>
      )}

      {/* Key fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Membership', guest.membership],
          ['Stay', `${guest.arrival_date || '?'} → ${guest.depart_date || '?'}`],
          ['Nights', guest.nights ? `${guest.nights} nights` : '—'],
          ['Room', guest.room || '—'],
          ['Nationality', guest.nationality || '—'],
          ['Linked stay', guest.linked_stay || 'No'],
          ['WhatsApp', guest.whatsapp || '—'],
          ['Email', guest.email || '—'],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-word' }}>{val}</div>
          </div>
        ))}
      </div>
      {guest.notes && (
        <div style={{ fontSize: 12, color: 'var(--ink2)', background: 'var(--sand)', borderRadius: 8, padding: '8px 10px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 3 }}>Key notes</div>
          {guest.notes}
        </div>
      )}

      {/* Stage */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 5 }}>Stage</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <FieldSelect value={guest.status} onChange={changeStatus}
            options={ALL_STATUSES.includes(guest.status) ? ALL_STATUSES : [guest.status, ...ALL_STATUSES]}
            style={{ marginBottom: 0, flex: 1 }} />
          {!guest.outcome && guest.status !== 'Converted' && (
            <Btn variant="danger" size="sm" onClick={markNoDeal}>No deal</Btn>
          )}
        </div>
      </div>

      {/* Ask Guru */}
      <div style={{ marginBottom: 16 }}>
        <AskGuru guest={guest} activity={activity} compact />
      </div>

      {/* Activity timeline */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 6 }}>Activity</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {[['note', 'Note'], ['whatsapp', 'WhatsApp'], ['meeting', 'Meeting'], ['email', 'Email']].map(([k, l]) => (
            <button key={k} onClick={() => setNoteType(k)} style={{
              border: '1px solid var(--border2)', borderRadius: 14, padding: '3px 9px', fontSize: 11, cursor: 'pointer',
              background: noteType === k ? 'var(--ocean)' : 'white', color: noteType === k ? 'white' : 'var(--ink3)', fontFamily: 'var(--font-body)',
            }}>{l}</button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={noteType === 'note' ? 'What happened? What did they say?' : `Log a ${noteType}: what was said or sent`}
          style={{
            width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 11px',
            fontFamily: 'var(--font-body)', fontSize: 12, background: 'var(--sand)', resize: 'none', height: 60,
            lineHeight: 1.5, marginBottom: 6, outline: 'none',
          }}
        />
        <Btn variant="ghost" size="sm" onClick={addNote} disabled={saving || !note.trim()} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
          <i className="ti ti-plus" /> {saving ? 'Saving...' : 'Add to activity'}
        </Btn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activity.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink4)' }}>Nothing logged yet.</div>}
          {activity.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <i className={`ti ${TYPE_ICON[a.type] || 'ti-point'}`} style={{ color: 'var(--ocean)', fontSize: 14, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink4)' }}>
                  {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {a.staff_name ? ` · ${a.staff_name}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 7 }}>
        <Btn variant="ghost" size="sm" onClick={() => onEdit(guest)} style={{ flex: 1, justifyContent: 'center' }}>
          <i className="ti ti-pencil" /> Edit guest
        </Btn>
        <Btn variant="danger" size="sm" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center' }}>
          <i className="ti ti-trash" /> Delete
        </Btn>
      </div>
    </div>
  )
}

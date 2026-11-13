import React, { useState, useEffect, useCallback } from 'react'
import { Avatar, Btn, FieldSelect, ALL_STATUSES } from './UI'
import { AskGuru } from './AskGuru'
import { formatDaysLeft, hasLeft, isLeavingSoon, tourLabel } from '../lib/dates'
import { nextAction } from '../lib/nextAction'
import { weekTag } from '../lib/history'
import { getInteractions, logInteraction } from '../lib/supabase'

const TYPE_ICON = {
  note: 'ti-notes', status_change: 'ti-arrows-exchange', outcome: 'ti-flag',
  whatsapp: 'ti-brand-whatsapp', email: 'ti-mail', meeting: 'ti-calendar',
}

function Chip({ icon, bg, color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, background: bg, color, borderRadius: 14, padding: '3px 10px' }}>
      <i className={`ti ${icon}`} /> {children}
    </span>
  )
}

export function GuestProfile({ guest, staffName, onStatusChange, onEditGuest, onDelete, onEdit, stickyTop = 0 }) {
  const [activity, setActivity] = useState([])
  const [tab, setTab] = useState('overview')
  // Only what Mois logged himself (WhatsApp, notes, meetings...), not automatic stage changes
  const logged = activity.filter(a => a.type !== 'status_change')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [saving, setSaving] = useState(false)

  const loadActivity = useCallback(async () => {
    if (!guest?.id) return setActivity([])
    try { setActivity(await getInteractions(guest.id)) } catch { setActivity([]) }
  }, [guest?.id])

  useEffect(() => { loadActivity() }, [loadActivity, guest?.status])
  useEffect(() => { setTab('overview') }, [guest?.id])

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

  const firstName = guest.name.split(/\s|&/)[0]
  const Label = ({ children }) => (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 4 }}>{children}</div>
  )

  return (
    <div>
      {/* ── Fixed header: who, stage, stay, tabs ── */}
      <div style={{ position: 'sticky', top: stickyTop, zIndex: 2, background: 'white', borderBottom: '1px solid var(--border)', padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <Avatar initials={guest.initials} colorIndex={guest.color_index} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, lineHeight: 1.2 }}>{guest.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
              {guest.arrival_date || '?'} → {guest.depart_date || '?'}{guest.nights ? ` · ${guest.nights} nights` : ''}{guest.room ? ` · Rm ${guest.room}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {departed && <Chip icon="ti-plane-departure" bg="#F0F0F0" color="#888">Departed</Chip>}
          {leavingSoon && !departed && <Chip icon="ti-clock" bg="var(--rose-light)" color="var(--rose)">{formatDaysLeft(guest.depart_date)}</Chip>}
          {guest.tour_at && <Chip icon="ti-calendar-event" bg="#FBF3E4" color="#9A6A1F">Tour {tourLabel(guest.tour_at)}</Chip>}
          {guest._stayKind === 'returning' && <Chip icon="ti-refresh" bg="#FBF3E4" color="#9A6A1F">Returning guest</Chip>}
          {guest._stayKind === 'continuing' && <Chip icon="ti-link" bg="var(--ocean-light)" color="var(--ocean)">Continuing stay</Chip>}
          {guest.outcome && <Chip icon={guest.outcome === 'won' ? 'ti-trophy' : 'ti-circle-x'} bg={guest.outcome === 'won' ? 'var(--palm-light)' : '#F3F2EE'} color={guest.outcome === 'won' ? 'var(--palm)' : '#8A8A8E'}>{guest.outcome === 'won' ? 'Won' : 'No deal'}</Chip>}
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
          <FieldSelect value={guest.status} onChange={changeStatus}
            options={ALL_STATUSES.includes(guest.status) ? ALL_STATUSES : [guest.status, ...ALL_STATUSES]}
            style={{ marginBottom: 0, flex: 1 }} />
          {guest.whatsapp && (
            <a href={`https://wa.me/${guest.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" title="Open WhatsApp"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 8, background: '#25D366', color: 'white', fontSize: 12.5, fontWeight: 500, textDecoration: 'none' }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 16 }} /> WhatsApp
            </a>
          )}
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          {[['overview', 'Overview'], ['guru', 'Ask Guru'], ['activity', `Activity${logged.length ? ` · ${logged.length}` : ''}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              padding: '9px 4px', fontSize: 13, fontWeight: tab === k ? 600 : 400,
              color: tab === k ? 'var(--ocean)' : 'var(--ink3)',
              borderBottom: `2px solid ${tab === k ? 'var(--ocean)' : 'transparent'}`,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* ── OVERVIEW ── */}
        {tab === 'overview' && <>
          {next && (
            <div style={{ background: 'var(--gold-light)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
              <Label>Next step</Label>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{next.action}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{next.reason}</div>
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <Btn size="sm" onClick={() => setTab('guru')}><i className="ti ti-sparkles" /> Ask Guru</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setTab('activity')}><i className="ti ti-plus" /> Log something</Btn>
              </div>
            </div>
          )}

          {guest.outcome && (
            <div style={{ background: guest.outcome === 'won' ? 'var(--palm-light)' : '#F3F2EE', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 12.5 }}>
                <strong>{guest.outcome === 'won' ? 'Won' : 'No deal'}</strong>{guest.outcome_reason ? `: ${guest.outcome_reason}` : ''}
              </div>
              {guest.outcome === 'lost' && <Btn variant="ghost" size="sm" onClick={reopen}>Reopen</Btn>}
            </div>
          )}

          {guest.notes && (
            <div style={{ fontSize: 13, color: 'var(--ink2)', background: 'var(--sand)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
              <Label>Leadsheet notes</Label>
              {guest.notes}
            </div>
          )}

          {guest._past?.length > 0 && (
            <div style={{ background: guest._stayKind === 'returning' ? '#FBF3E4' : 'var(--ocean-light)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
              <Label>{guest._stayKind === 'returning' ? `Earlier stays · ${guest._past.length}` : 'Continuing from'}</Label>
              {guest._past.slice(0, 4).map(p => (
                <div key={p.id} style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 5 }}>
                  <div style={{ fontWeight: 500 }}>{weekTag(p)} <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>({p.arrival_date} → {p.depart_date}) · {p.status}{p.outcome === 'lost' ? ' · no deal' : p.outcome === 'won' ? ' · bought' : ''}</span></div>
                  {p.outcome_reason && <div style={{ color: 'var(--ink2)' }}>Why: {p.outcome_reason}</div>}
                  {p.notes && <div style={{ color: 'var(--ink2)' }}>{p.notes}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['Membership', guest.membership || guest.member_type || '—'],
              ['Member #', guest.member_number || '—'],
              ['Nationality', guest.nationality || '—'],
              ['Linked stay', guest.linked_stay || 'No'],
              ['WhatsApp', guest.whatsapp || '—'],
              ['Email', guest.email || '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <Label>{label}</Label>
                <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <Btn variant="ghost" size="sm" onClick={() => onEdit(guest)} style={{ flex: 1, justifyContent: 'center' }}>
              <i className="ti ti-pencil" /> Edit
            </Btn>
            {!guest.outcome && guest.status !== 'Converted' && (
              <Btn variant="ghost" size="sm" onClick={markNoDeal} style={{ flex: 1, justifyContent: 'center' }}>
                <i className="ti ti-circle-x" /> No deal
              </Btn>
            )}
            <Btn variant="danger" size="sm" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center' }}>
              <i className="ti ti-trash" /> Delete
            </Btn>
          </div>
        </>}

        {/* ── ASK GURU ── */}
        {tab === 'guru' && <AskGuru guest={guest} activity={logged} compact />}

        {/* ── ACTIVITY ── */}
        {tab === 'activity' && <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {[['whatsapp', 'WhatsApp', 'ti-brand-whatsapp'], ['note', 'Note', 'ti-notes'], ['meeting', 'Meeting', 'ti-calendar'], ['email', 'Email', 'ti-mail']].map(([k, l, ic]) => (
              <button key={k} onClick={() => setNoteType(k)} style={{
                border: '1px solid var(--border2)', borderRadius: 16, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer',
                background: noteType === k ? 'var(--ocean)' : 'white', color: noteType === k ? 'white' : 'var(--ink2)', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}><i className={`ti ${ic}`} /> {l}</button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={noteType === 'note' ? `What happened with ${firstName}? What did they say?` : `Log a ${noteType}: what was said or sent`}
            style={{
              width: '100%', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px',
              fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', resize: 'none', height: 72,
              lineHeight: 1.5, marginBottom: 8, outline: 'none',
            }}
          />
          <Btn size="sm" onClick={addNote} disabled={saving || !note.trim()} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
            <i className="ti ti-plus" /> {saving ? 'Saving...' : 'Add to activity'}
          </Btn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logged.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink4)' }}>Nothing logged yet.</div>}
            {logged.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ocean-light)', color: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${TYPE_ICON[a.type] || 'ti-point'}`} style={{ fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{a.content}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>
                    {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {a.staff_name ? ` · ${a.staff_name}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Avatar, Btn, FieldSelect } from '../components/UI'
import { GuestCard } from '../components/GuestCard'
import { GuestProfile } from '../components/GuestProfile'
import { CalendarScreen } from './Calendar'
import { getStaffList } from '../lib/supabase'
import { untouchedLeads, repStats, UNTOUCHED_DAYS } from '../lib/manager'
import { tourLabel, tourDayKey, baliTodayKey, addDaysKey, weekStartKey } from '../lib/dates'

const TYPE_ICON = { note: 'ti-notes', whatsapp: 'ti-brand-whatsapp', email: 'ti-mail', meeting: 'ti-calendar', outcome: 'ti-flag' }
const ago = iso => {
  if (!iso) return 'nothing logged'
  const h = Math.round((Date.now() - new Date(iso)) / 3600000)
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

// MANAGER: every rep's numbers, untouched leads, the team calendar and
// what's been logged. Read-only: managers watch, reps work their guests.
export function ManagerScreen({ guests, interactions, isMobile, currentStaffId, tab: tabProp, onTab }) {
  const [staff, setStaff] = useState([])
  const [tabState, setTabState] = useState('overview')
  const tab = tabProp || tabState
  const setTab = t => (onTab ? onTab(t) : setTabState(t))
  const [repId, setRepId] = useState('all')
  const [openRep, setOpenRep] = useState(null)
  const [openGuestId, setOpenGuestId] = useState(null)

  useEffect(() => { getStaffList().then(setStaff).catch(() => setStaff([])) }, [])

  const reps = staff.filter(s => !s.is_manager || guests.some(g => g.assigned_to === s.id))
  const repName = id => staff.find(s => s.id === id)?.name || 'Unassigned'
  const untouched = useMemo(() => untouchedLeads(guests, interactions), [guests, interactions])
  const guestById = useMemo(() => Object.fromEntries(guests.map(g => [g.id, g])), [guests])
  const feed = interactions.filter(a => a.type !== 'status_change' && guestById[a.guest_id]).slice(0, 40)

  const today = baliTodayKey()
  const start = weekStartKey(today), end = addDaysKey(start, 6)
  const toursWeek = guests.filter(g => g.tour_at && tourDayKey(g.tour_at) >= start && tourDayKey(g.tour_at) <= end)
    .sort((a, b) => a.tour_at.localeCompare(b.tour_at))

  const noop = () => {}

  // ── One rep's pipeline (read-only) ──
  if (openRep) {
    const theirs = guests.filter(g => g.assigned_to === openRep.id)
    const sel = theirs.find(g => g.id === openGuestId)
    return (
      <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--gold-light)', borderBottom: '1px solid var(--border)' }}>
          <Btn variant="ghost" size="sm" onClick={() => { setOpenRep(null); setOpenGuestId(null) }}><i className="ti ti-arrow-left" /> Team</Btn>
          <div style={{ fontSize: 13, color: 'var(--amber)' }}><strong>{openRep.name}</strong>'s guests · read-only</div>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 90px' : '16px 20px' }}>
            {theirs.length === 0 && <div style={{ color: 'var(--ink4)', fontSize: 13 }}>No guests assigned yet.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {theirs.map(g => <GuestCard key={g.id} guest={g} selected={openGuestId === g.id} onClick={setOpenGuestId} />)}
            </div>
          </div>
          {!isMobile && (
            <div style={{ width: 380, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
              <GuestProfile guest={sel} onStatusChange={noop} onEditGuest={noop} onDelete={noop} onEdit={noop} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const calGuests = repId === 'all' ? guests : guests.filter(g => g.assigned_to === repId)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {!tabProp && <div style={{ display: 'flex', gap: 2, padding: '0 18px', borderBottom: '1px solid var(--border)', background: 'white' }}>
        {[['overview', 'Overview'], ['calendar', 'Team calendar'], ['activity', 'Activity']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: '12px 14px', fontSize: 13.5,
            fontWeight: tab === k ? 600 : 400, color: tab === k ? 'var(--ocean)' : 'var(--ink3)',
            borderBottom: `2px solid ${tab === k ? 'var(--ocean)' : 'transparent'}`,
          }}>{l}{k === 'overview' && untouched.length ? <span style={{ marginLeft: 6, background: 'var(--rose)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{untouched.length}</span> : null}</button>
        ))}
      </div>}

      {tab === 'calendar' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 22px 0', maxWidth: 320 }}>
            <FieldSelect value={repId} onChange={setRepId} options={[{ value: 'all', label: 'All reps' }, ...reps.map(r => ({ value: r.id, label: r.name }))]} />
          </div>
          <CalendarScreen guests={calGuests} isMobile={isMobile} readOnly repLabel={g => repName(g.assigned_to)} onOpenGuest={id => { const g = guestById[id]; const r = staff.find(s => s.id === g?.assigned_to); if (r) { setOpenRep(r); setOpenGuestId(id) } }} />
        </div>
      )}

      {tab !== 'calendar' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 90px' : '18px 22px' }}>
          {tab === 'overview' && <>
            {/* Untouched leads */}
            <div style={{ background: untouched.length ? 'var(--rose-light)' : 'var(--palm-light)', border: `1px solid ${untouched.length ? 'rgba(192,80,74,.25)' : 'rgba(45,90,61,.2)'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: untouched.length ? 'var(--rose)' : 'var(--palm)', marginBottom: untouched.length ? 10 : 0 }}>
                <i className={`ti ${untouched.length ? 'ti-alert-triangle' : 'ti-circle-check'}`} /> {untouched.length
                  ? `${untouched.length} lead${untouched.length > 1 ? 's' : ''} not touched ${UNTOUCHED_DAYS}+ days after check-in`
                  : `Every in-house lead has been touched within ${UNTOUCHED_DAYS} days`}
              </div>
              {untouched.map(({ guest: g, daysIn }) => (
                <div key={g.id} onClick={() => { const r = staff.find(s => s.id === g.assigned_to); if (r) { setOpenRep(r); setOpenGuestId(g.id) } }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 10, padding: '9px 12px', marginBottom: 6, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{repName(g.assigned_to)} · checked in {daysIn} days ago · {g.status}{g.depart_date ? ` · leaves ${g.depart_date}` : ''}</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: 'var(--ink4)' }} />
                </div>
              ))}
            </div>

            {/* Reps */}
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 8 }}>Reps · this week</div>
            {reps.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 18 }}>No reps yet. Once reps sign up they appear here.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 22 }}>
              {reps.map(r => {
                const s = repStats(r, guests, interactions)
                const flagged = untouched.filter(u => u.guest.assigned_to === r.id).length
                return (
                  <div key={r.id} onClick={() => setOpenRep(r)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar initials={r.avatar_initials || r.name?.slice(0, 2).toUpperCase()} colorIndex={0} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.name}{r.id === currentStaffId ? ' (you)' : ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Last logged {ago(s.lastActivity)}</div>
                      </div>
                      {flagged > 0 && <span style={{ background: 'var(--rose)', color: 'white', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>{flagged} untouched</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center' }}>
                      {[['Guests', s.guests], ['Logged', s.logged], ['Tours', s.toursBooked], ['Toured', s.toured], ['Won', s.converted]].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: l === 'Won' && v ? 'var(--palm)' : 'var(--ink)' }}>{v}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tours this week */}
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 8 }}>Tours booked this week · {toursWeek.length}</div>
            {toursWeek.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 18 }}>No tours booked this week yet.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
              {toursWeek.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
                  <div style={{ minWidth: 120, fontWeight: 600, color: '#9A6A1F', fontSize: 13 }}>{tourLabel(g.tour_at)}</div>
                  <div style={{ flex: 1, fontSize: 13.5 }}>{g.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{repName(g.assigned_to)}</div>
                </div>
              ))}
            </div>
          </>}

          {(tab === 'overview' || tab === 'activity') && <>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 8 }}>Latest logged activity</div>
            {feed.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink4)' }}>Nothing logged in the last 3 weeks.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(tab === 'overview' ? feed.slice(0, 8) : feed).map(a => {
                const g = guestById[a.guest_id]
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10, background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ocean-light)', color: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${TYPE_ICON[a.type] || 'ti-point'}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13 }}><strong>{repName(g.assigned_to)}</strong> on <strong>{g.name}</strong></div>
                      <div style={{ fontSize: 13, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink4)', marginTop: 2 }}>{new Date(a.created_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {tab === 'overview' && feed.length > 8 && <Btn variant="ghost" size="sm" onClick={() => setTab('activity')} style={{ marginTop: 10 }}>See all activity</Btn>}
          </>}
        </div>
      )}
    </div>
  )
}

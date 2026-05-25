import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionHeader } from './UI'

const STATUS_CFG = {
  'Arriving Soon':  { bg: '#EBF6F8', color: '#1A5F6E' },
  'Contacted':      { bg: '#F3F2EE', color: '#6E6E73' },
  'Meeting Booked': { bg: '#FBF5EB', color: '#B8762A' },
  'Follow-Up':      { bg: '#FBF0EF', color: '#C0504A' },
  'Hot Lead':       { bg: '#FBF0EF', color: '#C0504A' },
  'Proposal Sent':  { bg: '#EAF2ED', color: '#2D5A3D' },
  'Converted':      { bg: '#EAF2ED', color: '#2D5A3D' },
}

const AVATAR_COLORS = [
  { bg: '#EBF6F8', color: '#1A5F6E' },
  { bg: '#EAF2ED', color: '#2D5A3D' },
  { bg: '#FBF0EF', color: '#C0504A' },
  { bg: '#FBF5EB', color: '#B8762A' },
  { bg: '#F0EDFC', color: '#5A3DB8' },
]

function GuestCard({ g, i }) {
  const ac = AVATAR_COLORS[i % AVATAR_COLORS.length]
  const sc = STATUS_CFG[g.status] || STATUS_CFG['Arriving Soon']
  const scoreColor = g.upgrade_score > 70 ? '#C0504A' : g.upgrade_score > 50 ? '#B8762A' : '#AEAEB2'
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{g.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{g.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span>{g.member_type}</span>
          <span>·</span>
          <span>{g.arrival_date} → {g.depart_date}</span>
          <span>·</span>
          <span>{g.nights} nights</span>
          {g.nationality && <><span>·</span><span>{g.nationality}</span></>}
        </div>
        {g.membership && <div style={{ fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic', marginBottom: 2 }}>{g.membership}</div>}
        {g.email && <div style={{ fontSize: 11, color: 'var(--ocean)' }}>{g.email}{g.whatsapp ? ` · ${g.whatsapp}` : ''}</div>}
        {g.notes && <div style={{ fontSize: 11.5, color: 'var(--ink2)', marginTop: 4 }}>{g.notes}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: sc.bg, color: sc.color }}>{g.status}</span>
        {g.upgrade_score > 0 && <div style={{ fontSize: 11, color: scoreColor }}>↑ {g.upgrade_score}%</div>}
      </div>
    </div>
  )
}

export function WeekHistoryScreen({ currentWeek, onStartNewWeek }) {
  const [weeks, setWeeks] = useState([])
  const [expandedWeek, setExpandedWeek] = useState(currentWeek || 21)
  const [guestsByWeek, setGuestsByWeek] = useState({})
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newWeekNum, setNewWeekNum] = useState((currentWeek || 21) + 1)
  const [newWeekStart, setNewWeekStart] = useState('')
  const [newWeekEnd, setNewWeekEnd] = useState('')
  const [starting, setStarting] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  useEffect(() => {
    loadWeeks()
    loadGuestsForWeek(currentWeek || 21)
  }, [])

  async function loadWeeks() {
    const { data } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false })
    setWeeks(data || [])
  }

  async function loadGuestsForWeek(weekNum) {
    if (guestsByWeek[weekNum]) return // already loaded
    setLoading(true)
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('week_number', weekNum)
      .order('created_at', { ascending: true })
    setGuestsByWeek(prev => ({ ...prev, [weekNum]: data || [] }))
    setLoading(false)
  }

  async function handleExpand(weekNum) {
    if (expandedWeek === weekNum) {
      setExpandedWeek(null)
      return
    }
    setExpandedWeek(weekNum)
    await loadGuestsForWeek(weekNum)
  }

  async function handleStartNewWeek() {
    if (!confirmArchive) {
      setConfirmArchive(true)
      return
    }
    setStarting(true)
    try {
      // Get current guests for summary
      const { data: currentGuests } = await supabase
        .from('guests')
        .select('*')
        .eq('week_number', currentWeek)

      const toured = (currentGuests || []).filter(g =>
        ['Meeting Booked','Contacted','Follow-Up','Hot Lead','Proposal Sent','Converted'].includes(g.status)
      ).length
      const converted = (currentGuests || []).filter(g => g.status === 'Converted').length

      // Update current week summary and archive it
      await supabase.from('weeks').update({
        status: 'archived',
        guest_count: (currentGuests || []).length,
        toured_count: toured,
        converted_count: converted,
      }).eq('week_number', currentWeek)

      // Create new week
      await supabase.from('weeks').insert([{
        week_number: newWeekNum,
        week_label: `Week ${newWeekNum}`,
        start_date: newWeekStart,
        end_date: newWeekEnd,
        status: 'active',
      }])

      await loadWeeks()
      setShowModal(false)
      setConfirmArchive(false)
      onStartNewWeek(newWeekNum)
    } finally {
      setStarting(false)
    }
  }

  async function deleteWeek(weekNum, weekLabel) {
    if (!window.confirm(`Delete ${weekLabel} and all its guest records permanently? This cannot be undone.`)) return
    // Delete all guests from this week
    await supabase.from('guests').delete().eq('week_number', weekNum)
    // Delete the week record
    await supabase.from('weeks').delete().eq('week_number', weekNum)
    // Remove from local cache
    setGuestsByWeek(prev => { const n = { ...prev }; delete n[weekNum]; return n })
    setExpandedWeek(null)
    await loadWeeks()
  }

  const activeWeek = weeks.find(w => w.status === 'active') || { week_number: currentWeek, week_label: `Week ${currentWeek}`, status: 'active' }
  const pastWeeks = weeks.filter(w => w.status === 'archived')
  const currentGuests = guestsByWeek[currentWeek] || []
  const currentToured = currentGuests.filter(g => ['Meeting Booked','Contacted','Follow-Up','Hot Lead','Proposal Sent','Converted'].includes(g.status)).length
  const currentConverted = currentGuests.filter(g => g.status === 'Converted').length

  const WeekRow = ({ week, isCurrent }) => {
    const guests = guestsByWeek[week.week_number] || []
    const isExpanded = expandedWeek === week.week_number
    const toured = week.toured_count || guests.filter(g => ['Meeting Booked','Contacted','Follow-Up','Hot Lead','Proposal Sent','Converted'].includes(g.status)).length
    const converted = week.converted_count || guests.filter(g => g.status === 'Converted').length
    const guestCount = isCurrent ? currentGuests.length : (week.guest_count || 0)

    return (
      <div style={{ marginBottom: 8 }}>
        <div
          onClick={() => handleExpand(week.week_number)}
          style={{
            background: isExpanded ? 'var(--ocean-light)' : 'white',
            border: `1px solid ${isExpanded ? 'var(--ocean2)' : 'var(--border)'}`,
            borderRadius: isExpanded ? '12px 12px 0 0' : 12,
            padding: isCurrent ? '16px 20px' : '13px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all .15s',
          }}>
          <div>
            <div style={{ fontFamily: isCurrent ? 'var(--font-display)' : 'inherit', fontSize: isCurrent ? 22 : 14, fontWeight: isCurrent ? 400 : 500, marginBottom: 3 }}>
              {week.week_label}
              {isCurrent && <span style={{ fontSize: 11, background: 'var(--ocean)', color: 'white', borderRadius: 10, padding: '2px 8px', marginLeft: 10, fontFamily: 'var(--font-body)', fontWeight: 500 }}>Current</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
              {week.start_date && week.end_date ? `${week.start_date} — ${week.end_date}` : 'Click to view guests'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'center', alignItems: 'center' }}>
            {[
              [guestCount, 'Guests', 'var(--ocean)'],
              [toured, 'Toured', 'var(--amber)'],
              [converted, 'Converted', 'var(--palm)'],
            ].map(([val, label, color]) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: isCurrent ? 26 : 18, color }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              </div>
            ))}
            <button
                onClick={e => { e.stopPropagation(); deleteWeek(week.week_number, week.week_label) }}
                style={{
                  background: 'var(--rose-light)', color: 'var(--rose)',
                  border: '1px solid rgba(192,80,74,.2)', borderRadius: 8,
                  padding: '6px 10px', cursor: 'pointer', fontSize: 11,
                  fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete
              </button>
            <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 16, color: 'var(--ink3)' }} />
          </div>
        </div>

        {isExpanded && (
          <div style={{
            border: '1px solid var(--ocean2)', borderTop: 'none',
            borderRadius: '0 0 12px 12px', background: 'var(--sand)',
            padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>Loading guests...</div>}
            {!loading && guests.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>
                {isCurrent ? 'No guests yet. Import your leadsheet to add them.' : 'No guest data recorded for this week.'}
              </div>
            )}
            {!loading && guests.map((g, i) => <GuestCard key={g.id} g={g} i={i} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Week History" right={
        <Btn variant="ocean" size="sm" onClick={() => { setShowModal(true); setConfirmArchive(false) }}>
          <i className="ti ti-calendar-plus" /> Start New Week
        </Btn>
      } />

      {/* START NEW WEEK MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,26,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 24, width: 440, boxShadow: '0 8px 32px rgba(24,24,26,.12)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>Start Week {newWeekNum}</div>

            {!confirmArchive ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, lineHeight: 1.6 }}>
                  This will archive <strong>Week {currentWeek}</strong> and start a clean Week {newWeekNum}. All current guests will be saved to the Week {currentWeek} archive. Your new pipeline will be empty — ready for your Week {newWeekNum} leadsheet import.
                </p>
                <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(184,118,42,.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 20, fontSize: 12, color: 'var(--amber)' }}>
                  <strong>{currentGuests.length} guests</strong> from Week {currentWeek} will be archived. {currentConverted} converted, {currentToured} toured.
                </div>

                {[
                  ['New Week Number', 'number', newWeekNum, v => setNewWeekNum(Number(v)), ''],
                  ['Week Start Date', 'text', newWeekStart, setNewWeekStart, 'e.g. 30 May 2026'],
                  ['Week End Date', 'text', newWeekEnd, setNewWeekEnd, 'e.g. 5 Jun 2026'],
                ].map(([label, type, val, setter, ph]) => (
                  <div key={label}>
                    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                      style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', marginBottom: 12, outline: 'none' }} />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
                  <Btn variant="ocean" onClick={() => setConfirmArchive(true)}>
                    Continue →
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20, lineHeight: 1.6 }}>
                  Are you sure? Week {currentWeek} will be archived and your pipeline will be cleared. You cannot undo this.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variant="ghost" onClick={() => setConfirmArchive(false)}>← Back</Btn>
                  <Btn variant="ocean" onClick={handleStartNewWeek} disabled={starting}>
                    <i className="ti ti-check" /> {starting ? 'Archiving...' : `Yes, Start Week ${newWeekNum}`}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CURRENT WEEK */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Current Week</div>
        <WeekRow week={activeWeek} isCurrent={true} />
      </div>

      {/* PAST WEEKS */}
      {pastWeeks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Past Weeks</div>
          {pastWeeks.map(w => <WeekRow key={w.id} week={w} isCurrent={false} />)}
        </div>
      )}

      {pastWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink4)' }}>
          <i className="ti ti-history" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: .3 }} />
          <p style={{ fontSize: 13 }}>No past weeks yet. Click Start New Week when Week {currentWeek} is done.</p>
        </div>
      )}
    </div>
  )
}

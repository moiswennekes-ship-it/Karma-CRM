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

export function WeekHistoryScreen({ currentWeek, onStartNewWeek }) {
  const [weeks, setWeeks] = useState([])
  const [selectedWeekNum, setSelectedWeekNum] = useState(currentWeek || 21)
  const [weekGuests, setWeekGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newWeekNum, setNewWeekNum] = useState((currentWeek || 21) + 1)
  const [newWeekStart, setNewWeekStart] = useState('')
  const [newWeekEnd, setNewWeekEnd] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => { loadWeeks() }, [])

  // Load current week guests on mount
  useEffect(() => {
    loadGuests(currentWeek || 21)
  }, [currentWeek])

  async function loadWeeks() {
    const { data } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false })
    setWeeks(data || [])
  }

  async function loadGuests(weekNum) {
    setLoadingGuests(true)
    const { data } = await supabase
      .from('guests')
      .select('*')
      .or(`week_number.eq.${weekNum},week_number.is.null`)
      .eq('archived', false)
      .order('created_at', { ascending: true })
    setWeekGuests(data || [])
    setLoadingGuests(false)
  }

  async function handleSelectWeek(weekNum) {
    setSelectedWeekNum(weekNum)
    setLoadingGuests(true)
    if (weekNum === (currentWeek || 21)) {
      // Current week — include guests with no week number
      const { data } = await supabase
        .from('guests')
        .select('*')
        .or(`week_number.eq.${weekNum},week_number.is.null`)
        .eq('archived', false)
        .order('created_at', { ascending: true })
      setWeekGuests(data || [])
    } else {
      // Past week — only guests from that week
      const { data } = await supabase
        .from('guests')
        .select('*')
        .eq('week_number', weekNum)
        .order('created_at', { ascending: true })
      setWeekGuests(data || [])
    }
    setLoadingGuests(false)
  }

  async function handleStartNewWeek() {
    setStarting(true)
    try {
      // Archive current week
      await supabase.from('weeks').update({ status: 'archived' }).eq('week_number', currentWeek)

      // Get all current guests
      const { data: currentGuests } = await supabase
        .from('guests').select('*')
        .or(`week_number.eq.${currentWeek},week_number.is.null`)
        .eq('archived', false)

      const today = new Date()
      const toArchive = []
      const toCarry = []

      for (const g of (currentGuests || [])) {
        if (isDeparted(g.depart_date, today)) toArchive.push(g.id)
        else toCarry.push(g.id)
      }

      if (toArchive.length > 0) {
        await supabase.from('guests').update({ archived: true, archive_week: currentWeek }).in('id', toArchive)
      }
      if (toCarry.length > 0) {
        await supabase.from('guests').update({ week_number: newWeekNum, week_label: `Week ${newWeekNum}` }).in('id', toCarry)
      }

      // Update week summary
      const toured = (currentGuests || []).filter(g => ['Meeting Booked','Contacted','Follow-Up','Hot Lead','Proposal Sent','Converted'].includes(g.status)).length
      const converted = (currentGuests || []).filter(g => g.status === 'Converted').length
      await supabase.from('weeks').update({ guest_count: (currentGuests || []).length, toured_count: toured, converted_count: converted }).eq('week_number', currentWeek)

      // Create new week
      await supabase.from('weeks').insert([{ week_number: newWeekNum, week_label: `Week ${newWeekNum}`, start_date: newWeekStart, end_date: newWeekEnd, status: 'active' }])

      await loadWeeks()
      setShowModal(false)
      onStartNewWeek(newWeekNum)
    } finally {
      setStarting(false)
    }
  }

  function isDeparted(departDate, today) {
    if (!departDate) return false
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }
    const parts = departDate.toLowerCase().split(/\s+/)
    if (parts.length >= 3) {
      const day = parseInt(parts[0])
      const mon = months[parts[1]?.substring(0,3)]
      const yr = parseInt('20' + parts[2])
      if (!isNaN(day) && mon !== undefined && !isNaN(yr)) {
        return new Date(yr, mon, day) < today
      }
    }
    return false
  }

  const activeWeek = weeks.find(w => w.status === 'active') || { week_number: currentWeek, week_label: `Week ${currentWeek}`, status: 'active' }
  const pastWeeks = weeks.filter(w => w.status === 'archived')

  const toured = weekGuests.filter(g => ['Meeting Booked','Contacted','Follow-Up','Hot Lead','Proposal Sent','Converted'].includes(g.status)).length
  const converted = weekGuests.filter(g => g.status === 'Converted').length

  const GuestCard = ({ g, i }) => {
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

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Week History" right={
        <Btn variant="ocean" size="sm" onClick={() => setShowModal(true)}>
          <i className="ti ti-calendar-plus" /> Start New Week
        </Btn>
      } />

      {/* START NEW WEEK MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,26,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 24, width: 420, boxShadow: '0 8px 32px rgba(24,24,26,.12)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>Start Week {newWeekNum}</div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, lineHeight: 1.6 }}>
              This will archive Week {currentWeek}. Departed guests will be archived. In-house guests carry over to Week {newWeekNum}.
            </p>
            {[
              ['Week Number', 'number', newWeekNum, setNewWeekNum, ''],
              ['Start Date', 'text', newWeekStart, setNewWeekStart, 'e.g. 30 May 2026'],
              ['End Date', 'text', newWeekEnd, setNewWeekEnd, 'e.g. 5 Jun 2026'],
            ].map(([label, type, val, setter, ph]) => (
              <div key={label}>
                <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>{label}</label>
                <input type={type} value={val} onChange={e => setter(type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={ph}
                  style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', marginBottom: 12, outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
              <Btn variant="ocean" onClick={handleStartNewWeek} disabled={starting}>
                <i className="ti ti-calendar-plus" /> {starting ? 'Starting...' : `Start Week ${newWeekNum}`}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* CURRENT WEEK */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Current Week</div>
        <div
          onClick={() => handleSelectWeek(activeWeek.week_number)}
          style={{
            background: selectedWeekNum === activeWeek.week_number ? 'var(--ocean-light)' : 'white',
            border: `1px solid ${selectedWeekNum === activeWeek.week_number ? 'var(--ocean2)' : 'var(--border)'}`,
            borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: 'var(--shadow)', transition: 'all .15s', marginBottom: 12,
          }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>{activeWeek.week_label}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
              {activeWeek.start_date && activeWeek.end_date ? `${activeWeek.start_date} — ${activeWeek.end_date}` : 'Click to view all guests'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
            {[
              [selectedWeekNum === activeWeek.week_number ? weekGuests.length : '—', 'Guests', 'var(--ocean)'],
              [selectedWeekNum === activeWeek.week_number ? toured : '—', 'Toured', 'var(--amber)'],
              [selectedWeekNum === activeWeek.week_number ? converted : '—', 'Converted', 'var(--palm)'],
            ].map(([val, label, color]) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Current week guest list */}
        {selectedWeekNum === activeWeek.week_number && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingGuests && <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>Loading guests...</div>}
            {!loadingGuests && weekGuests.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>No guests this week yet. Import your leadsheet to add them.</div>
            )}
            {!loadingGuests && weekGuests.map((g, i) => <GuestCard key={g.id} g={g} i={i} />)}
          </div>
        )}
      </div>

      {/* PAST WEEKS */}
      {pastWeeks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Past Weeks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastWeeks.map(w => (
              <div key={w.id}>
                <div
                  onClick={() => handleSelectWeek(w.week_number)}
                  style={{
                    background: selectedWeekNum === w.week_number ? 'var(--ocean-light)' : 'white',
                    border: `1px solid ${selectedWeekNum === w.week_number ? 'var(--ocean2)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all .15s', marginBottom: selectedWeekNum === w.week_number ? 8 : 0,
                  }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{w.week_label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                      {w.start_date && w.end_date ? `${w.start_date} — ${w.end_date}` : 'Click to view guests'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
                    {[
                      [w.guest_count || 0, 'Guests', 'var(--ink)'],
                      [w.toured_count || 0, 'Toured', 'var(--amber)'],
                      [w.converted_count || 0, 'Converted', 'var(--palm)'],
                    ].map(([val, label, color]) => (
                      <div key={label}>
                        <div style={{ fontWeight: 500, fontSize: 16, color }}>{val}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past week guest list */}
                {selectedWeekNum === w.week_number && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    {loadingGuests && <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>Loading guests...</div>}
                    {!loadingGuests && weekGuests.map((g, i) => <GuestCard key={g.id} g={g} i={i} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pastWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink4)' }}>
          <i className="ti ti-history" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: .3 }} />
          <p style={{ fontSize: 13 }}>No past weeks yet. When you start a new week, this week gets archived here.</p>
        </div>
      )}
    </div>
  )
}

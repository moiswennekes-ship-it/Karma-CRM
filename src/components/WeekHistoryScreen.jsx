import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionHeader, Card, CardHeader, CardBody } from './UI'

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
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [weekGuests, setWeekGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewWeekModal, setShowNewWeekModal] = useState(false)
  const [newWeekNum, setNewWeekNum] = useState((currentWeek || 21) + 1)
  const [newWeekStart, setNewWeekStart] = useState('')
  const [newWeekEnd, setNewWeekEnd] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    loadWeeks()
  }, [])

  async function loadWeeks() {
    setLoading(true)
    const { data } = await supabase
      .from('weeks')
      .select('*')
      .order('week_number', { ascending: false })
    setWeeks(data || [])
    setLoading(false)
  }

  async function loadWeekGuests(weekNum) {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('week_number', weekNum)
      .order('created_at', { ascending: true })
    setWeekGuests(data || [])
  }

  async function handleSelectWeek(week) {
    setSelectedWeek(week)
    await loadWeekGuests(week.week_number)
  }

  async function handleStartNewWeek() {
    setStarting(true)
    try {
      // 1. Archive current week
      await supabase
        .from('weeks')
        .update({ status: 'archived' })
        .eq('week_number', currentWeek)

      // 2. Archive guests who have departed (depart_date doesn't include 'Jun' or future)
      // We'll archive all guests from the current week
      const { data: currentGuests } = await supabase
        .from('guests')
        .select('*')
        .eq('week_number', currentWeek)
        .eq('archived', false)

      // Guests to carry over: those still in-house (not converted/no deal)
      // Guests to archive: everyone else
      const today = new Date()
      const toArchive = []
      const toCarryOver = []

      for (const g of (currentGuests || [])) {
        // Try to parse depart date
        const departed = isDeparted(g.depart_date, today)
        if (departed) {
          toArchive.push(g.id)
        } else {
          toCarryOver.push(g.id)
        }
      }

      // Archive departed guests
      if (toArchive.length > 0) {
        await supabase
          .from('guests')
          .update({ archived: true, archive_week: currentWeek })
          .in('id', toArchive)
      }

      // Carry over in-house guests to new week
      if (toCarryOver.length > 0) {
        await supabase
          .from('guests')
          .update({ week_number: newWeekNum, week_label: `Week ${newWeekNum}` })
          .in('id', toCarryOver)
      }

      // 3. Create new week
      await supabase
        .from('weeks')
        .insert([{
          week_number: newWeekNum,
          week_label: `Week ${newWeekNum}`,
          start_date: newWeekStart,
          end_date: newWeekEnd,
          status: 'active',
        }])

      // 4. Update summary for archived week
      const toured = (currentGuests || []).filter(g => ['Meeting Booked', 'Contacted', 'Follow-Up', 'Hot Lead', 'Proposal Sent', 'Converted'].includes(g.status)).length
      const converted = (currentGuests || []).filter(g => g.status === 'Converted').length
      await supabase
        .from('weeks')
        .update({
          guest_count: (currentGuests || []).length,
          toured_count: toured,
          converted_count: converted,
        })
        .eq('week_number', currentWeek)

      await loadWeeks()
      setShowNewWeekModal(false)
      onStartNewWeek(newWeekNum)
    } catch(e) {
      console.error(e)
    } finally {
      setStarting(false)
    }
  }

  function isDeparted(departDate, today) {
    if (!departDate) return false
    // Try to parse dates like "31 May 26", "8 Jun 26"
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }
    const parts = departDate.toLowerCase().split(/\s+/)
    if (parts.length >= 3) {
      const day = parseInt(parts[0])
      const mon = months[parts[1]?.substring(0,3)]
      const yr = parseInt('20' + parts[2])
      if (!isNaN(day) && mon !== undefined && !isNaN(yr)) {
        const d = new Date(yr, mon, day)
        return d < today
      }
    }
    return false
  }

  const activeWeek = weeks.find(w => w.status === 'active')
  const pastWeeks = weeks.filter(w => w.status === 'archived')

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader
        title="Week History"
        right={
          <Btn variant="ocean" size="sm" onClick={() => setShowNewWeekModal(true)}>
            <i className="ti ti-calendar-plus" /> Start New Week
          </Btn>
        }
      />

      {/* New Week Modal */}
      {showNewWeekModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(24,24,26,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setShowNewWeekModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 16, padding: 24, width: 420,
            boxShadow: '0 8px 32px rgba(24,24,26,.12)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>Start Week {newWeekNum}</div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, lineHeight: 1.6 }}>
              This will archive Week {currentWeek}. Guests who have already departed will be archived. Guests still in-house will carry over to Week {newWeekNum}.
            </p>

            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>Week Number</label>
            <input
              type="number"
              value={newWeekNum}
              onChange={e => setNewWeekNum(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', marginBottom: 12, outline: 'none' }}
            />

            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>Week Start Date</label>
            <input
              type="text"
              value={newWeekStart}
              onChange={e => setNewWeekStart(e.target.value)}
              placeholder="e.g. 30 May 2026"
              style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', marginBottom: 12, outline: 'none' }}
            />

            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>Week End Date</label>
            <input
              type="text"
              value={newWeekEnd}
              onChange={e => setNewWeekEnd(e.target.value)}
              placeholder="e.g. 5 Jun 2026"
              style={{ width: '100%', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--sand)', marginBottom: 20, outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowNewWeekModal(false)}>Cancel</Btn>
              <Btn variant="ocean" onClick={handleStartNewWeek} disabled={starting}>
                <i className="ti ti-calendar-plus" /> {starting ? 'Starting...' : `Start Week ${newWeekNum}`}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Current Week */}
      {activeWeek && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Current Week</div>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>{activeWeek.week_label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                    {activeWeek.start_date && activeWeek.end_date ? `${activeWeek.start_date} — ${activeWeek.end_date}` : 'Dates not set'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ocean)' }}>{activeWeek.guest_count || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Guests</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber)' }}>{activeWeek.toured_count || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Toured</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--palm)' }}>{activeWeek.converted_count || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Converted</div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Past Weeks */}
      {pastWeeks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>Past Weeks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {pastWeeks.map(w => (
              <div key={w.id}
                onClick={() => handleSelectWeek(w)}
                style={{
                  background: selectedWeek?.id === w.id ? 'var(--ocean-light)' : 'white',
                  border: `1px solid ${selectedWeek?.id === w.id ? 'var(--ocean2)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all .15s',
                }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{w.week_label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>
                    {w.start_date && w.end_date ? `${w.start_date} — ${w.end_date}` : 'Dates not recorded'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 16 }}>{w.guest_count || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Guests</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 16, color: 'var(--amber)' }}>{w.toured_count || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Toured</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 16, color: 'var(--palm)' }}>{w.converted_count || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>Converted</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected week guest list */}
          {selectedWeek && weekGuests.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>
                {selectedWeek.week_label} — {weekGuests.length} Guests
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weekGuests.map((g, i) => {
                  const ac = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  const sc = STATUS_CFG[g.status] || STATUS_CFG['Arriving Soon']
                  return (
                    <div key={g.id} style={{
                      background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                      padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: ac.bg, color: ac.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 500, flexShrink: 0,
                      }}>{g.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{g.membership} · {g.arrival_date} → {g.depart_date}</div>
                        {g.notes && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{g.notes}</div>}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                        {g.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && pastWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink4)' }}>
          <i className="ti ti-history" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: .3 }} />
          <p style={{ fontSize: 13 }}>No past weeks yet. When you start a new week, the current week will be archived here.</p>
        </div>
      )}
    </div>
  )
}

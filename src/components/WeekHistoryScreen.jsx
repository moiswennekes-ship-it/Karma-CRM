import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionHeader } from './UI'
import { karmaWeekRange } from '../lib/dates'
import { callClaude } from '../lib/claude'

// AI review of a week: what converted, what didn't and why, patterns to act on.
function WeeklyReview({ weekNumber, weekYear }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true); setText('')
    try {
      const { data: guests } = await supabase.from('guests').select('*').eq('week_number', weekNumber).eq('week_year', weekYear)
      const ids = (guests || []).map(g => g.id)
      const { data: acts } = ids.length
        ? await supabase.from('interactions').select('guest_id,type,content,created_at').in('guest_id', ids).order('created_at', { ascending: true })
        : { data: [] }
      const lines = (guests || []).map(g => {
        const a = (acts || []).filter(x => x.guest_id === g.id && x.type !== 'status_change').map(x => x.content).slice(-4).join(' | ')
        return `- ${g.name} (${g.member_type || '?'}, ${g.membership || '?'}): stage ${g.status}${g.outcome ? `, outcome ${g.outcome}${g.outcome_reason ? ` (${g.outcome_reason})` : ''}` : ''}${a ? `. Notes: ${a}` : ''}`
      }).join('\n')
      const prompt = `Review Week ${weekNumber} for Mois. Guests this week:\n${lines || '- none'}\n\nWrite a short weekly review:\n1. The numbers in one line (guests, meetings, conversions, no-deals).\n2. What worked, with the guest names it worked on.\n3. Why deals were lost, and any pattern across them.\n4. Two specific things to do differently next week.\n5. One thing to carry into next week (no contact with departed guests: company rules don't allow follow-up after check-out).\nPlain text, under 250 words. Be honest, not cheerleading.`
      setText(await callClaude(prompt, 900))
    } catch (e) {
      setText('Could not write the review: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--ocean-light), var(--palm-light))', border: '1px solid rgba(26,95,110,.18)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
          <i className="ti ti-sparkles" /> Week {weekNumber} review
        </div>
        <Btn size="sm" onClick={run} disabled={loading}>{loading ? 'Reviewing...' : text ? 'Refresh' : 'Review my week'}</Btn>
      </div>
      {text && <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>{text}</div>}
    </div>
  )
}

const STATUS_CFG = {
  'Arriving Soon':  { bg: '#EBF6F8', color: '#1A5F6E' },
  'Contacted':      { bg: '#F3F2EE', color: '#6E6E73' },
  'Meeting Booked': { bg: '#FBF5EB', color: '#B8762A' },
  'Tour Booked':    { bg: '#FBF5EB', color: '#B8762A' },
  'Toured':         { bg: '#F0EDFC', color: '#5A3DB8' },
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

function GuestCard({ g, i, onOpen }) {
  const ac = AVATAR_COLORS[i % AVATAR_COLORS.length]
  const sc = STATUS_CFG[g.status] || STATUS_CFG['Arriving Soon']
  return (
    <div onClick={() => onOpen && onOpen(g.id)} title="Open guest file"
      style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: onOpen ? 'pointer' : 'default' }}>
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
        {g.outcome === 'lost' && <span style={{ fontSize: 10.5, color: 'var(--rose)' }}>No deal</span>}
        {onOpen && <span style={{ fontSize: 10.5, color: 'var(--ocean)' }}>Open file <i className="ti ti-chevron-right" /></span>}
      </div>
    </div>
  )
}

const TOURED = ['Toured', 'Follow-Up', 'Hot Lead', 'Converted']
const keyOf = (n, y) => `${y}-${String(n).padStart(2, '0')}`

// Sat–Fri dates for a week number in a given Karma year.
function rangeFor(n, y) {
  const jan1 = new Date(Date.UTC(y, 0, 1))
  const firstSat = Date.UTC(y, 0, 1 + ((6 - jan1.getUTCDay() + 7) % 7))
  const d = new Date(firstSat + (n - 1) * 7 * 86400000 + 12 * 3600000)
  return karmaWeekRange(new Date(d.getTime() - 8 * 3600000))
}

export function WeekHistoryScreen({ currentWeek, currentYear, onOpenGuest }) {
  const curKey = keyOf(currentWeek, currentYear)
  const [weekRows, setWeekRows] = useState([])
  const [statusRows, setStatusRows] = useState([])
  const [expanded, setExpanded] = useState(curKey)
  const [guestsByWeek, setGuestsByWeek] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
    loadGuestsForWeek(currentWeek, currentYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, currentYear])

  async function load() {
    const [{ data: w }, { data: g }] = await Promise.all([
      supabase.from('weeks').select('*'),
      supabase.from('guests').select('week_number, week_year, status'),
    ])
    setWeekRows(w || [])
    setStatusRows(g || [])
  }

  async function loadGuestsForWeek(n, y, force = false) {
    const k = keyOf(n, y)
    if (guestsByWeek[k] && !force) return
    setLoading(true)
    const { data } = await supabase.from('guests').select('*')
      .eq('week_number', n).eq('week_year', y).order('created_at', { ascending: true })
    setGuestsByWeek(prev => ({ ...prev, [k]: data || [] }))
    setLoading(false)
  }

  async function toggle(w) {
    if (expanded === w.key) { setExpanded(null); return }
    setExpanded(w.key)
    await loadGuestsForWeek(w.n, w.y)
  }

  async function deleteWeek(w) {
    if (!window.confirm(`Delete Week ${w.n} ${w.y} and all its guest records permanently? This cannot be undone.`)) return
    await supabase.from('guests').delete().eq('week_number', w.n).eq('week_year', w.y)
    await supabase.from('weeks').delete().eq('week_number', w.n).eq('week_year', w.y)
    setGuestsByWeek(prev => { const x = { ...prev }; delete x[w.key]; return x })
    setExpanded(null)
    await load()
  }

  // Every week that has a weeks row or any guests, with live counts.
  const map = {}
  const add = (n, y) => {
    if (!n || !y) return null
    const k = keyOf(n, y)
    if (!map[k]) map[k] = { key: k, n, y, guests: 0, toured: 0, converted: 0 }
    return map[k]
  }
  weekRows.forEach(r => { const w = add(r.week_number, r.week_year); if (w) w.row = r })
  statusRows.forEach(g => {
    const w = add(g.week_number, g.week_year); if (!w) return
    w.guests++
    if (TOURED.includes(g.status)) w.toured++
    if (g.status === 'Converted') w.converted++
  })
  add(currentWeek, currentYear)
  const all = Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
  const upcoming = all.filter(w => w.key > curKey).reverse()
  const current = map[curKey]
  const past = all.filter(w => w.key < curKey)

  const WeekRow = ({ w, kind }) => {
    const guests = guestsByWeek[w.key] || []
    const open = expanded === w.key
    const big = kind === 'current'
    const range = w.row?.start_date && w.row?.end_date ? { start: w.row.start_date, end: w.row.end_date } : rangeFor(w.n, w.y)
    return (
      <div style={{ marginBottom: 8 }}>
        <div onClick={() => toggle(w)} style={{
          background: open ? 'var(--ocean-light)' : 'white',
          border: `1px solid ${open ? 'var(--ocean2)' : 'var(--border)'}`,
          borderRadius: open ? '12px 12px 0 0' : 12,
          padding: big ? '16px 20px' : '13px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: big ? 'var(--font-display)' : 'inherit', fontSize: big ? 22 : 14, fontWeight: big ? 400 : 500, marginBottom: 3 }}>
              Week {w.n}{w.y !== currentYear ? ` · ${w.y}` : ''}
              {kind === 'current' && <span style={{ fontSize: 11, background: 'var(--ocean)', color: 'white', borderRadius: 10, padding: '2px 8px', marginLeft: 10, fontFamily: 'var(--font-body)', fontWeight: 500 }}>Current</span>}
              {kind === 'upcoming' && <span style={{ fontSize: 11, background: 'var(--amber-light)', color: 'var(--amber)', borderRadius: 10, padding: '2px 8px', marginLeft: 10, fontFamily: 'var(--font-body)', fontWeight: 500 }}>Coming up</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{range.start} — {range.end}</div>
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'center', alignItems: 'center' }}>
            {[[w.guests, 'Guests', 'var(--ocean)'], [w.toured, 'Toured', 'var(--amber)'], [w.converted, 'Converted', 'var(--palm)']].map(([val, label, color]) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: big ? 26 : 18, color }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              </div>
            ))}
            {kind === 'past' && (
              <button onClick={e => { e.stopPropagation(); deleteWeek(w) }} style={{
                background: 'var(--rose-light)', color: 'var(--rose)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 8,
                padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 4,
              }}><i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete</button>
            )}
            <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 16, color: 'var(--ink3)' }} />
          </div>
        </div>
        {open && (
          <div style={{ border: '1px solid var(--ocean2)', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'var(--sand)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kind === 'past' && <WeeklyReview weekNumber={w.n} weekYear={w.y} />}
            {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>Loading guests...</div>}
            {!loading && guests.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink4)', fontSize: 13 }}>
                {kind === 'past' ? 'No guest data recorded for this week.' : 'No guests yet. Import your leadsheet to add them.'}
              </div>
            )}
            {!loading && guests.map((g, i) => <GuestCard key={g.id} g={g} i={i} onOpen={onOpenGuest} />)}
          </div>
        )}
      </div>
    )
  }

  const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10 }}>{children}</div>
  )

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <WeeklyReview weekNumber={currentWeek} weekYear={currentYear} />
      <SectionHeader title="Weeks" right={
        <span style={{ fontSize: 11, color: 'var(--ink3)' }}>
          <i className="ti ti-calendar-repeat" /> New week starts automatically every Saturday
        </span>
      } />
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Label>Coming up</Label>
          {upcoming.map(w => <WeekRow key={w.key} w={w} kind="upcoming" />)}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <Label>Current week</Label>
        {current && <WeekRow w={current} kind="current" />}
      </div>
      <Label>Past weeks</Label>
      {past.length > 0 ? past.map(w => <WeekRow key={w.key} w={w} kind="past" />) : (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink4)' }}>
          <i className="ti ti-history" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: .3 }} />
          <p style={{ fontSize: 13 }}>Past weeks appear here automatically, with every guest and their notes.</p>
        </div>
      )}
    </div>
  )
}

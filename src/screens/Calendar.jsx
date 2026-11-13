import React, { useState, useMemo } from 'react'
import { Btn, FieldInput, FieldLabel, FieldSelect, StatusPill } from '../components/UI'
import {
  baliTodayKey, stayKey, addDaysKey, weekStartKey, keyLabel,
  tourDayKey, tourTime, tourLabel, tourIso, karmaWeek,
} from '../lib/dates'
import { logInteraction } from '../lib/supabase'

const BOOKABLE = ['Arriving Soon', 'Contacted']

// CALENDAR: every guest's stay across the Karma week (Sat–Fri), with tours.
// Tap a day inside a guest's stay to book (or move) their tour.
export function CalendarScreen({ guests, isMobile, onEditGuest, onOpenGuest, staffName }) {
  const today = baliTodayKey()
  const [start, setStart] = useState(weekStartKey(today))
  const [booking, setBooking] = useState(null)   // { guestId, day, time }
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(start, i)), [start])
  const end = days[6]
  const weekNo = karmaWeek(new Date(`${start}T12:00:00+08:00`))

  const rows = useMemo(() => guests
    .map(g => ({ g, arr: stayKey(g.arrival_date), dep: stayKey(g.depart_date), tourDay: tourDayKey(g.tour_at) }))
    .filter(r => r.arr && r.dep && r.arr <= end && r.dep >= start)
    .sort((a, b) => a.arr.localeCompare(b.arr) || a.g.name.localeCompare(b.g.name)),
  [guests, start, end])

  const tours = rows
    .filter(r => r.tourDay && r.tourDay >= start && r.tourDay <= end)
    .sort((a, b) => a.g.tour_at.localeCompare(b.g.tour_at))

  const daySummary = day => ({
    ins: rows.filter(r => r.arr === day).length,
    outs: rows.filter(r => r.dep === day).length,
    house: rows.filter(r => r.arr <= day && r.dep > day).length,
    tours: rows.filter(r => r.tourDay === day).length,
  })

  function openBooking(g, day) {
    setErr(null)
    setBooking({ guestId: g?.id || '', day: day || today, time: g?.tour_at ? tourTime(g.tour_at) : '10:00' })
  }

  async function saveTour(remove = false) {
    const g = guests.find(x => x.id === booking.guestId)
    if (!g) { setErr('Pick a guest'); return }
    setSaving(true); setErr(null)
    try {
      if (remove) {
        await onEditGuest(g.id, { tour_at: null })
        await logInteraction({ guest_id: g.id, type: 'meeting', content: 'Tour cancelled', staff_name: staffName || null }).catch(() => {})
      } else {
        const iso = tourIso(booking.day, booking.time)
        const updates = { tour_at: iso }
        if (BOOKABLE.includes(g.status)) updates.status = 'Tour Booked'
        await onEditGuest(g.id, updates)
        await logInteraction({ guest_id: g.id, type: 'meeting', content: `Tour booked: ${tourLabel(iso)}`, staff_name: staffName || null }).catch(() => {})
      }
      setBooking(null)
    } catch (e) {
      setErr(/tour_at/.test(e.message || '') ? 'Tour booking needs a one-time database update. Ask Claude to run it.' : e.message)
    } finally {
      setSaving(false)
    }
  }

  const cols = `minmax(${isMobile ? 120 : 170}px, 1.3fr) repeat(7, minmax(${isMobile ? 64 : 88}px, 1fr))`
  const bookingGuest = booking && guests.find(x => x.id === booking.guestId)
  const pickable = rows.filter(r => r.dep >= today).map(r => r.g)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 10px 90px' : '18px 22px' }}>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn variant="ghost" size="sm" onClick={() => setStart(addDaysKey(start, -7))}><i className="ti ti-chevron-left" /></Btn>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, minWidth: 200 }}>
          Week {weekNo} <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink3)' }}>{keyLabel(start, { day: 'numeric', month: 'short' })} – {keyLabel(end, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => setStart(addDaysKey(start, 7))}><i className="ti ti-chevron-right" /></Btn>
        {start !== weekStartKey(today) && <Btn variant="ghost" size="sm" onClick={() => setStart(weekStartKey(today))}>This week</Btn>}
        <div style={{ flex: 1 }} />
        <Btn size="sm" onClick={() => openBooking(null, days.includes(today) ? today : start)}><i className="ti ti-calendar-plus" /> Book a tour</Btn>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ minWidth: isMobile ? 120 + 7 * 64 : 760 }}>
          {/* Day headers + summary */}
          <div style={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
            <div style={{ padding: '10px 12px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>{rows.length} guests</div>
            {days.map(d => {
              const s = daySummary(d)
              const isToday = d === today
              return (
                <div key={d} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)', background: isToday ? 'var(--ocean-light)' : 'transparent' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? 'var(--ocean)' : 'var(--ink)' }}>{keyLabel(d, { weekday: 'short' })} {keyLabel(d, { day: 'numeric' })}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2, lineHeight: 1.4 }}>
                    {s.ins > 0 && <span style={{ color: 'var(--palm)' }}>{s.ins} in </span>}
                    {s.outs > 0 && <span style={{ color: 'var(--rose)' }}>{s.outs} out </span>}
                    {s.tours > 0 && <span style={{ color: '#5A3DB8', fontWeight: 600 }}>{s.tours} tour{s.tours > 1 ? 's' : ''}</span>}
                    {!s.ins && !s.outs && !s.tours && <span>{s.house} in house</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {rows.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>No guests staying this week.</div>}

          {rows.map(({ g, arr, dep, tourDay }) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid var(--border)', minHeight: 44 }}>
              <div onClick={() => onOpenGuest(g.id)} title="Open guest file" style={{ padding: '7px 12px', cursor: 'pointer', minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ transform: 'scale(.85)', transformOrigin: 'left' }}><StatusPill status={g.status} /></span>
                </div>
              </div>
              {days.map(d => {
                const inStay = d >= arr && d <= dep
                const isIn = d === arr, isOut = d === dep
                const hasTour = tourDay === d
                return (
                  <div key={d}
                    onClick={() => inStay && openBooking(g, d)}
                    title={inStay ? (hasTour ? `Tour ${tourTime(g.tour_at)}: tap to change` : 'Tap to book a tour this day') : ''}
                    style={{ borderLeft: '1px solid var(--border)', padding: '6px 0', cursor: inStay ? 'pointer' : 'default', background: d === today ? 'rgba(26,95,110,.04)' : 'transparent', display: 'flex', alignItems: 'center' }}>
                    {inStay && (
                      <div style={{
                        width: '100%', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        background: g.outcome === 'lost' ? '#F3F2EE' : 'var(--ocean-light)',
                        marginLeft: isIn ? 6 : 0, marginRight: isOut ? 6 : 0,
                        borderTopLeftRadius: isIn ? 14 : 0, borderBottomLeftRadius: isIn ? 14 : 0,
                        borderTopRightRadius: isOut ? 14 : 0, borderBottomRightRadius: isOut ? 14 : 0,
                        fontSize: 10, fontWeight: 600,
                      }}>
                        {isIn && !hasTour && <span style={{ color: 'var(--palm)' }}>IN</span>}
                        {isOut && !hasTour && <span style={{ color: 'var(--rose)' }}>OUT</span>}
                        {hasTour && (
                          <span style={{ background: '#5A3DB8', color: 'white', borderRadius: 10, padding: '2px 7px' }}>
                            <i className="ti ti-calendar-event" /> {tourTime(g.tour_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tours this week */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 8 }}>Tours this week · {tours.length}</div>
        {tours.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink4)' }}>No tours booked yet. Tap a day in a guest's stay to book one.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {tours.map(({ g }) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
              <div style={{ minWidth: 92, fontWeight: 600, color: '#5A3DB8', fontSize: 12.5 }}>{tourLabel(g.tour_at)}</div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpenGuest(g.id)}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{g.membership || g.member_type}{g.room ? ` · Rm ${g.room}` : ''} · {g.arrival_date} → {g.depart_date}</div>
              </div>
              <Btn variant="ghost" size="sm" onClick={() => openBooking(g, tourDayKey(g.tour_at))}><i className="ti ti-pencil" /></Btn>
            </div>
          ))}
        </div>
      </div>

      {/* Book / move a tour */}
      {booking && (
        <div onClick={() => setBooking(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,26,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 12px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 20, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(24,24,26,.15)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 12 }}>{bookingGuest?.tour_at ? 'Change tour' : 'Book a tour'}</div>
            <FieldLabel>Guest</FieldLabel>
            <FieldSelect value={booking.guestId} onChange={v => setBooking({ ...booking, guestId: v })}
              options={[{ value: '', label: 'Choose a guest…' }, ...pickable.map(g => ({ value: g.id, label: `${g.name} (${g.arrival_date} → ${g.depart_date})` }))]} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel>Day</FieldLabel><FieldInput type="date" value={booking.day} onChange={v => setBooking({ ...booking, day: v })} /></div>
              <div><FieldLabel>Time</FieldLabel><FieldInput type="time" value={booking.time} onChange={v => setBooking({ ...booking, time: v })} /></div>
            </div>
            {bookingGuest && (stayKey(bookingGuest.arrival_date) > booking.day || stayKey(bookingGuest.depart_date) < booking.day) && (
              <div style={{ fontSize: 11.5, color: 'var(--amber)', marginBottom: 10 }}>Heads up: that day is outside their stay ({bookingGuest.arrival_date} → {bookingGuest.depart_date}).</div>
            )}
            {err && <div style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 10 }}>Couldn't save: {err}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn onClick={() => saveTour(false)} disabled={saving || !booking.guestId || !booking.day || !booking.time}>{saving ? 'Saving…' : 'Save tour'}</Btn>
              <Btn variant="ghost" onClick={() => setBooking(null)}>Cancel</Btn>
              {bookingGuest?.tour_at && <Btn variant="danger" onClick={() => saveTour(true)} disabled={saving}>Remove tour</Btn>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

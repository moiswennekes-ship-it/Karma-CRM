import React, { useState } from 'react'
import { Btn, Card, CardHeader, CardBody, SectionHeader } from './UI'

// Column indices (0-based) based on actual leadsheet layout:
// A=0 Name, B=1 VP ID, C=2 Room, D=3 Arrival, E=4 Depart, F=5 Nights
// G=6 Booking Number, H=7, I=8, J=9, K=10 (ignored)
// L=11 Membership Details, M=12 Nationality, N=13 Linked Stay
// O=14 Linked Stay Detail, P=15 Email, Q=16 Phone, R=17 Rep
// S=18 Appoint Date, T=19 Appoint Time, U=20 Tour/No tour
// V=21 Tour Updated, W=22 Product, X=23 Deal $
// Notes column = last meaningful column (varies, we grab from col 24+)

function getCol(cols, idx) {
  return (cols[idx] || '').trim()
}

function detectMemberType(membership) {
  if (!membership) return 'KC Member'
  const m = membership.toLowerCase()
  if (m.includes('krk') || m.includes('km/') || m.includes('kb/') || m.includes('kk/') || m.includes('t0f') || m.includes('t1f') || m.includes('t2f')) return 'Fractional Owner'
  if (m.includes('karma club discovery')) return 'KC Member'
  return 'KC Member'
}

function parseYears(membership) {
  const match = (membership || '').match(/(\d+)\s*years?/i)
  return match ? parseInt(match[1]) : 0
}

function detectStatus(notes, tourDate, tourTime, tourNoTour) {
  const n = (notes || '').toLowerCase()
  const t = (tourNoTour || '').toLowerCase()
  if (n.includes('no deal') || t.includes('no deal')) return 'Contacted'
  if (n.includes('toured') || n.includes('be toured')) return 'Contacted'
  if (tourDate && tourDate.length > 3) return 'Meeting Booked'
  if (n.includes('on price')) return 'Follow-Up'
  if (n.includes('good shot')) return 'Hot Lead'
  if (n.includes('cancelled a fractional')) return 'Hot Lead'
  if (n.includes('welcome email') || n.includes('whatsapp sent')) return 'Contacted'
  if (n.includes('book tour')) return 'Arriving Soon'
  return 'Arriving Soon'
}

function calcScore(memberType, years, notes, tourDate) {
  let score = 40
  if (memberType === 'Fractional Owner') score += 10
  if (years >= 15) score += 15
  else if (years >= 8) score += 10
  else if (years >= 3) score += 5
  const n = (notes || '').toLowerCase()
  if (n.includes('good shot')) score += 20
  if (n.includes('cancelled a fractional')) score += 15
  if (n.includes('no deal')) score = Math.max(5, score - 35)
  if (n.includes('no interest')) score = Math.max(5, score - 25)
  if (n.includes('book tour')) score += 8
  if (tourDate && tourDate.length > 3) score += 10
  if (n.includes('only here for') && n.includes('days')) score += 5
  return Math.min(95, Math.max(5, score))
}

function parseLeadsheet(text) {
  const lines = text.split('\n')
  const guestMap = {}
  const guestOrder = []

  for (const line of lines) {
    const cols = line.split('\t')
    if (cols.length < 6) continue

    const name = getCol(cols, 0)
    if (!name) continue
    // Skip header rows and section headers
    if (name.toLowerCase().includes('karma kandara') ||
        name.toLowerCase().includes('karma group') ||
        name.toLowerCase().includes('kc member') ||
        name.toLowerCase().includes('fractional') ||
        name.toLowerCase() === 'name') continue
    // Skip if name looks like a number or booking ref
    if (/^\d+/.test(name)) continue

    const vpId = getCol(cols, 1)
    const room = getCol(cols, 2)
    const arrival = getCol(cols, 3)
    const depart = getCol(cols, 4)
    const nights = parseInt(getCol(cols, 5)) || 0
    const bookingNum = getCol(cols, 6)
    const membership = getCol(cols, 11)
    const nationality = getCol(cols, 12)
    const linkedStay = getCol(cols, 13)
    const linkedDetail = getCol(cols, 14)
    const email = getCol(cols, 15)
    const phone = getCol(cols, 16)
    const rep = getCol(cols, 17)
    const apptDate = getCol(cols, 18)
    const apptTime = getCol(cols, 19)
    const tourNoTour = getCol(cols, 20)
    // Notes - grab from col 24 onwards, join any non-empty ones
    const noteParts = []
    for (let i = 24; i < cols.length; i++) {
      const v = (cols[i] || '').trim()
      if (v && v !== 'FALSE' && v !== 'TRUE' && v !== 'YES' && v !== 'NO') noteParts.push(v)
    }
    const notes = noteParts.join(' — ').trim()

    const memberType = detectMemberType(membership)
    const years = parseYears(membership)

    if (guestMap[name]) {
      // Duplicate — same guest, additional booking
      const g = guestMap[name]
      if (bookingNum && !g.bookingNumbers.includes(bookingNum)) {
        g.bookingNumbers.push(bookingNum)
      }
      if (membership && !g.memberships.includes(membership)) {
        g.memberships.push(membership)
      }
      // Keep longest notes
      if (notes && notes.length > (g.notes || '').length) g.notes = notes
      // Keep latest appt if present
      if (apptDate && apptDate.length > 3) { g.apptDate = apptDate; g.apptTime = apptTime }
    } else {
      guestMap[name] = {
        name,
        vpId,
        room,
        arrival,
        depart,
        nights,
        bookingNumbers: bookingNum ? [bookingNum] : [],
        memberships: membership ? [membership] : [],
        memberType,
        years,
        nationality,
        linkedStay,
        linkedDetail,
        email,
        phone,
        rep,
        apptDate,
        apptTime,
        tourNoTour,
        notes,
      }
      guestOrder.push(name)
    }
  }

  return guestOrder.map((name, i) => {
    const g = guestMap[name]
    const memberType = g.memberType
    const status = detectStatus(g.notes, g.apptDate, g.apptTime, g.tourNoTour)
    const score = calcScore(memberType, g.years, g.notes, g.apptDate)
    const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase()).slice(0, 2).join('')
    const membership = g.memberships.join(' + ') || memberType

    // Build party string from linked stay detail
    let party = g.nationality || ''
    if (g.linkedDetail && g.linkedDetail !== 'NO') party = g.linkedDetail

    // Last stay from years
    const lastStay = g.years ? `${g.years} year${g.years !== 1 ? 's' : ''} as member` : 'Unknown'

    return {
      name,
      initials,
      membership,
      member_type: memberType,
      arrival_date: g.arrival,
      depart_date: g.depart,
      nights: g.nights,
      email: g.email,
      whatsapp: g.phone,
      notes: g.notes,
      status,
      upgrade_score: score,
      party,
      last_stay: lastStay,
      nationality: g.nationality,
      room: g.room,
      booking_numbers: g.bookingNumbers.join(', '),
      color_index: i % 5,
      tags: [],
    }
  })
}

const STATUS_CFG = {
  'Arriving Soon':  { bg: '#EBF6F8', color: '#1A5F6E' },
  'Contacted':      { bg: '#F3F2EE', color: '#6E6E73' },
  'Meeting Booked': { bg: '#FBF5EB', color: '#B8762A' },
  'Follow-Up':      { bg: '#FBF0EF', color: '#C0504A' },
  'Hot Lead':       { bg: '#FBF0EF', color: '#C0504A' },
  'Converted':      { bg: '#EAF2ED', color: '#2D5A3D' },
}

const AVATAR_COLORS = [
  { bg: '#EBF6F8', color: '#1A5F6E' },
  { bg: '#EAF2ED', color: '#2D5A3D' },
  { bg: '#FBF0EF', color: '#C0504A' },
  { bg: '#FBF5EB', color: '#B8762A' },
  { bg: '#F0EDFC', color: '#5A3DB8' },
]

export function ImportScreen({ onImport }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const handleParse = () => {
    setError(null)
    try {
      const guests = parseLeadsheet(text)
      setParsed(guests)
      setDone(false)
    } catch(e) {
      setError('Could not parse the leadsheet. Make sure you copied the data rows from Google Sheets.')
    }
  }

  const handleImport = async () => {
    if (!parsed || !parsed.length) return
    setImporting(true)
    try {
      for (const guest of parsed) {
        await onImport(guest)
      }
      setDone(true)
      setText('')
      setParsed(null)
    } catch(e) {
      setError('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Weekly Leadsheet Import" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, lineHeight: 1.6 }}>
        In Google Sheets, select all guest rows (not the header rows), copy with <strong>Ctrl+C</strong>, then paste below and click Parse. Guests with multiple bookings are automatically merged into one profile.
      </p>

      {done && (
        <div style={{ background: 'var(--palm-light)', border: '1px solid rgba(45,90,61,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-check" style={{ color: 'var(--palm)', fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--palm)' }}>Import complete!</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>All guests added to your pipeline. Go to Dashboard to see them.</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {!parsed && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Paste your leadsheet here" />
          <CardBody>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Select your guest rows in Google Sheets → Ctrl+C → click here → Ctrl+V"
              style={{
                width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
                padding: '12px', fontFamily: 'var(--font-body)', fontSize: 12,
                color: 'var(--ink)', background: 'var(--sand)', resize: 'none',
                height: 220, lineHeight: 1.5, marginBottom: 12, outline: 'none',
              }}
            />
            <Btn variant="ocean" onClick={handleParse} disabled={!text.trim()} style={{ width: '100%', justifyContent: 'center' }}>
              <i className="ti ti-table-import" /> Parse Leadsheet
            </Btn>
          </CardBody>
        </Card>
      )}

      {parsed && parsed.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{parsed.length} guests detected</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Review below then click Import All to add to your pipeline.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => { setParsed(null); setError(null) }}>
                <i className="ti ti-arrow-left" /> Back
              </Btn>
              <Btn variant="ocean" onClick={handleImport} disabled={importing}>
                <i className="ti ti-upload" /> {importing ? 'Importing...' : `Import All ${parsed.length} Guests`}
              </Btn>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parsed.map((g, i) => {
              const ac = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const sc = STATUS_CFG[g.status] || STATUS_CFG['Arriving Soon']
              const scoreColor = g.upgrade_score > 70 ? '#C0504A' : g.upgrade_score > 50 ? '#B8762A' : '#AEAEB2'
              return (
                <div key={i} style={{
                  background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                  padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: ac.bg, color: ac.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 500, flexShrink: 0,
                  }}>{g.initials}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{g.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink3)', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span><i className="ti ti-diamond" style={{ fontSize: 12 }} /> {g.member_type}</span>
                      <span><i className="ti ti-calendar" style={{ fontSize: 12 }} /> {g.arrival_date} → {g.depart_date}</span>
                      <span><i className="ti ti-moon" style={{ fontSize: 12 }} /> {g.nights} nights</span>
                      {g.nationality && <span><i className="ti ti-flag" style={{ fontSize: 12 }} /> {g.nationality}</span>}
                      {g.email && <span><i className="ti ti-mail" style={{ fontSize: 12 }} /> {g.email}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic', marginBottom: g.notes ? 4 : 0 }}>{g.membership}</div>
                    {g.notes && <div style={{ fontSize: 11.5, color: 'var(--ink2)' }}>{g.notes}</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: sc.bg, color: sc.color }}>
                      {g.status}
                    </span>
                    <div style={{ fontSize: 11, color: scoreColor }}>↑ {g.upgrade_score}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {parsed && parsed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>No guests detected. Make sure you selected the guest data rows (not the header).</p>
          <Btn variant="ghost" size="sm" onClick={() => setParsed(null)} style={{ marginTop: 12 }}>Try again</Btn>
        </div>
      )}
    </div>
  )
}

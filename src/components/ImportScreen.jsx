import React, { useState } from 'react'
import { Btn, Card, CardHeader, CardBody, SectionHeader } from './UI'

// ── COLUMN MAP (0-based) ──────────────────────────────────────
// A=0  Name
// B=1  VP ID (member number)
// C=2  Room No
// D=3  Arrival
// E=4  Depart
// F=5  Nights
// G=6  Booking Number
// L=11 Membership Details
// M=12 Nationality
// N=13 Linked Stay (YES/NO)
// O=14 Linked Stay Detail (FROM KM, TO KJ etc)
// P=15 Email
// Q=16 Phone/WhatsApp
// R=17 Rep (ignored)
// S=18 Appoint Date
// T=19 Appoint Time
// U=20 Tour/No tour
// Notes = col 24+ (first non-empty, non-boolean value)

function col(cols, idx) {
  return (cols[idx] || '').trim()
}

function detectMemberType(membership) {
  if (!membership) return 'KC Member'
  const m = membership.toLowerCase()
  // Fractional patterns: KRK, KM/, KB/, KK/, KRS, KJ, T0F, T1F, T2F
  if (/^k[a-z]{1,3}\s*\//.test(m) || m.includes('t0f') || m.includes('t1f') || m.includes('t2f')) {
    return 'Fractional Owner'
  }
  return 'KC Member'
}

function detectStatus(notes, apptDate, tourCol) {
  const n = (notes || '').toLowerCase()
  const t = (tourCol || '').toLowerCase()
  if (n.includes('no deal') || t.includes('no deal')) return 'Contacted'
  if (n.includes('toured') || n.includes('be toured')) return 'Contacted'
  if (apptDate && apptDate.length > 3) return 'Meeting Booked'
  if (n.includes('on price')) return 'Follow-Up'
  if (n.includes('good shot') || n.includes('cancelled a fractional')) return 'Hot Lead'
  if (n.includes('welcome email') || n.includes('whatsapp sent')) return 'Contacted'
  if (n.includes('book tour')) return 'Arriving Soon'
  return 'Arriving Soon'
}

function parseTSVWithQuotes(text) {
  // Properly handle quoted multi-line cells from Google Sheets
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (ch === '"' && !inQuotes) {
      inQuotes = true
      i++
    } else if (ch === '"' && inQuotes) {
      if (text[i+1] === '"') { cell += '"'; i += 2 }
      else { inQuotes = false; i++ }
    } else if (ch === '\t' && !inQuotes) {
      row.push(cell); cell = ''; i++
    } else if (ch === '\n' && !inQuotes) {
      row.push(cell); cell = ''
      if (row.some(c => c.trim())) rows.push(row)
      row = []; i++
    } else if (ch === '\r' && !inQuotes) {
      i++
    } else {
      cell += ch; i++
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some(c => c.trim())) rows.push(row) }
  return rows
}

function parseLeadsheet(text) {
  const rows = parseTSVWithQuotes(text)
  const guestMap = {}
  const guestOrder = []

  for (const cols of rows) {
    if (cols.length < 5) continue

    const name = col(cols, 0).replace(/\n.*/s, '').trim()
    if (!name) continue

    // Skip headers and section labels
    if (
      name.toLowerCase().includes('karma') ||
      name.toLowerCase() === 'name' ||
      name.toLowerCase() === 'kc member' ||
      name.toLowerCase() === 'fractional owner' ||
      /^\d{5,}/.test(name)
    ) continue

    const vpId        = col(cols, 1)
    const room        = col(cols, 2)
    const arrival     = col(cols, 3)
    const depart      = col(cols, 4)
    const nights      = parseInt(col(cols, 5)) || 0
    const bookingNum  = col(cols, 6)
    const membership  = col(cols, 11).replace(/\n/g, ' + ')
    const rawMemberType = col(cols, 8)
    const nationality = col(cols, 12)
    const linkedStay  = col(cols, 13)  // YES / NO
    const linkedDetail = col(cols, 14) // FROM KM, TO KJ, 2nd weeks etc
    const email       = col(cols, 15)
    const phone       = col(cols, 16)
    const apptDate    = col(cols, 18)
    const apptTime    = col(cols, 19)
    const tourCol     = col(cols, 20)

    // Notes: grab first meaningful value from col 24 onwards
    let notes = ''
    for (let i = 24; i < Math.min(cols.length, 35); i++) {
      const v = (cols[i] || '').trim()
      if (v && v !== 'FALSE' && v !== 'TRUE' && v !== 'YES' && v !== 'NO' && v.length > 3) {
        notes = v
        break
      }
    }

    const memberType = detectMemberType(membership, rawMemberType)

    // Build linked stay display
    let linkedDisplay = ''
    if (linkedStay === 'YES' && linkedDetail && linkedDetail !== 'YES') {
      linkedDisplay = linkedDetail
    } else if (linkedStay === 'YES') {
      linkedDisplay = 'YES'
    }

    if (guestMap[name]) {
      // Duplicate row — same guest, additional booking
      const g = guestMap[name]
      if (bookingNum && !g.bookingNumbers.includes(bookingNum)) {
        g.bookingNumbers.push(bookingNum)
      }
      if (membership && !g.memberships.includes(membership)) {
        g.memberships.push(membership)
      }
      if (notes && notes.length > (g.notes || '').length) g.notes = notes
      if (apptDate && apptDate.length > 3) { g.apptDate = apptDate; g.apptTime = apptTime }
    } else {
      guestMap[name] = {
        name, vpId, room, arrival, depart, nights,
        bookingNumbers: bookingNum ? [bookingNum] : [],
        memberships: membership ? [membership] : [],
        memberType, nationality,
        linkedStay: linkedDisplay,
        email, phone, apptDate, apptTime, tourCol, notes, rawMemberType,
      }
      guestOrder.push(name)
    }
  }

  return guestOrder.map((name, i) => {
    const g = guestMap[name]
    const membership = g.memberships.join(' + ') || g.memberType
    const memberType = detectMemberType(g.memberships[0] || '', g.rawMemberType)
    const status = detectStatus(g.notes, g.apptDate, g.tourCol)
    const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase()).slice(0, 2).join('')

    return {
      name,
      initials,
      member_number: g.vpId,
      room: g.room,
      membership,
      member_type: memberType,
      arrival_date: g.arrival,
      depart_date: g.depart,
      nights: g.nights,
      email: g.email,
      whatsapp: g.phone,
      nationality: g.nationality,
      linked_stay: g.linkedStay,
      notes: g.notes,
      status,
      upgrade_score: 0,
      party: g.nationality || '',
      last_stay: '',
      color_index: i % 5,
      tags: [],
      booking_numbers: g.bookingNumbers.join(', '),
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
      setError('Could not parse. Make sure you copied the guest rows from Google Sheets.')
    }
  }

  const handleImport = async () => {
    if (!parsed?.length) return
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
        In Google Sheets, select all guest rows (not the header rows), copy with <strong>Ctrl+C</strong>, paste below and click Parse. Guests with multiple bookings are automatically merged.
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
              placeholder="Select guest rows in Google Sheets → Ctrl+C → click here → Ctrl+V"
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
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Review then click Import All to add to your pipeline.</div>
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
              return (
                <div key={i} style={{
                  background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                  padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: ac.bg, color: ac.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 500, flexShrink: 0,
                  }}>{g.initials}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{g.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink3)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      {g.member_number && <span>#{g.member_number}</span>}
                      {g.room && <span>· Rm {g.room}</span>}
                      <span>· {g.member_type}</span>
                      <span>· {g.arrival_date} → {g.depart_date}</span>
                      <span>· {g.nights} nights</span>
                      {g.nationality && <span>· {g.nationality}</span>}
                      {g.linked_stay && <span>· 🔗 {g.linked_stay}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic', marginBottom: g.notes ? 4 : 0 }}>{g.membership}</div>
                    {g.email && <div style={{ fontSize: 11, color: 'var(--ocean)' }}>{g.email}{g.whatsapp ? ` · ${g.whatsapp}` : ''}</div>}
                    {g.notes && <div style={{ fontSize: 11.5, color: 'var(--ink2)', marginTop: 4 }}>{g.notes}</div>}
                  </div>

                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                    {g.status}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {parsed && parsed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 13 }}>No guests detected. Make sure you selected the guest data rows.</p>
          <Btn variant="ghost" size="sm" onClick={() => setParsed(null)} style={{ marginTop: 12 }}>Try again</Btn>
        </div>
      )}
    </div>
  )
}

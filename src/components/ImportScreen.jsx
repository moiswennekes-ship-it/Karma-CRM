import React, { useState } from 'react'
import { Btn, Card, CardHeader, CardBody, SectionHeader } from './UI'

const MEMBER_TYPE_MAP = {
  'fractional owner': 'Fractional Owner',
  'kc member': 'KC Member',
  'karma club discovery': 'KC Member',
}

function detectMemberType(raw) {
  if (!raw) return 'KC Member'
  const lower = raw.toLowerCase()
  for (const [key, val] of Object.entries(MEMBER_TYPE_MAP)) {
    if (lower.includes(key)) return val
  }
  return 'KC Member'
}

function calcUpgradeScore(memberType, years, notes, toured) {
  let score = 40
  if (memberType === 'Fractional Owner') score += 15
  if (years >= 10) score += 15
  else if (years >= 5) score += 8
  const n = (notes || '').toLowerCase()
  if (n.includes('good shot')) score += 20
  if (n.includes('no deal')) score = Math.max(5, score - 30)
  if (n.includes('no interest')) score = Math.max(5, score - 20)
  if (n.includes('cancelled')) score += 10
  if (toured) score += 10
  if (n.includes('book tour')) score += 5
  return Math.min(95, Math.max(5, score))
}

function detectStatus(notes, toured) {
  if (!notes) return 'Arriving Soon'
  const n = notes.toLowerCase()
  if (n.includes('no deal')) return 'Contacted'
  if (n.includes('toured')) return 'Contacted'
  if (n.includes('tour booked')) return 'Meeting Booked'
  if (n.includes('on price')) return 'Follow-Up'
  if (n.includes('good shot')) return 'Hot Lead'
  if (n.includes('welcome email') || n.includes('whatsapp sent')) return 'Contacted'
  return 'Arriving Soon'
}

function parseLeadsheet(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const guests = []

  for (const line of lines) {
    const cols = line.split('\t')
    if (cols.length < 5) continue

    const name = cols[0]?.trim()
    if (!name || name.toLowerCase().includes('karma kandara') || name.toLowerCase().includes('week')) continue

    const memberNum = cols[1]?.trim()
    const room = cols[2]?.trim()
    const arrival = cols[3]?.trim()
    const depart = cols[4]?.trim()
    const nights = parseInt(cols[5]) || 0
    const memberTypeRaw = cols[8]?.trim()
    const pointsYears = cols[11]?.trim()
    const nationality = cols[12]?.trim()
    const toured = cols[13]?.trim()?.toUpperCase() === 'YES'
    const email = cols[15]?.trim()
    const whatsapp = cols[16]?.trim()
    const notes = cols[22]?.trim() || ''

    // Parse years from points string e.g. "198 / Full / 14 years"
    const yearsMatch = (pointsYears || '').match(/(\d+)\s*years?/i)
    const years = yearsMatch ? parseInt(yearsMatch[1]) : 0

    // Parse points
    const pointsMatch = (pointsYears || '').match(/^(\d+|[A-Z]+)/)
    const points = pointsMatch ? pointsMatch[1] : ''

    const memberType = detectMemberType(memberTypeRaw)
    const status = detectStatus(notes, toured)
    const upgradeScore = calcUpgradeScore(memberType, years, notes, toured)

    // Build membership display string
    const membership = pointsYears
      ? `${pointsYears}`
      : memberType

    // Initials
    const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase()).slice(0, 2).join('')

    guests.push({
      name,
      initials,
      member_number: memberNum,
      room,
      arrival_date: arrival,
      depart_date: depart,
      nights,
      membership,
      member_type: memberType,
      nationality,
      email,
      whatsapp,
      notes,
      status,
      upgrade_score: upgradeScore,
      party: nationality || '',
      last_stay: years ? `${years} years as member` : 'Unknown',
      color_index: guests.length % 5,
      tags: [],
    })
  }

  return guests
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

  const handleParse = () => {
    const guests = parseLeadsheet(text)
    setParsed(guests)
    setDone(false)
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
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Weekly Leadsheet Import" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20, lineHeight: 1.6 }}>
        Open your weekly leadsheet in Excel, select all the guest rows (not the header), copy with Ctrl+C, then paste below and click Parse.
      </p>

      {done && (
        <div style={{ background: 'var(--palm-light)', border: '1px solid rgba(45,90,61,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-check" style={{ color: 'var(--palm)', fontSize: 20 }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--palm)' }}>Import complete!</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)' }}>All guests have been added to your pipeline. Go to Dashboard to see them.</div>
          </div>
        </div>
      )}

      {!parsed && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Paste your leadsheet here" />
          <CardBody>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Copy your guest rows from Excel and paste here..."
              style={{
                width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
                padding: '12px', fontFamily: 'var(--font-body)', fontSize: 12,
                color: 'var(--ink)', background: 'var(--sand)', resize: 'none',
                height: 200, lineHeight: 1.5, marginBottom: 12, outline: 'none',
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
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Review below then click Import All to add them to your pipeline.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="sm" onClick={() => setParsed(null)}>
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
                      {g.email && <span><i className="ti ti-mail" style={{ fontSize: 12 }} /> {g.email}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontStyle: 'italic' }}>{g.membership}</div>
                    {g.notes && <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>{g.notes}</div>}
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
          <p style={{ fontSize: 13 }}>No guests could be parsed. Make sure you copied the data rows from Excel (not the header row).</p>
          <Btn variant="ghost" size="sm" onClick={() => setParsed(null)} style={{ marginTop: 12 }}>Try again</Btn>
        </div>
      )}
    </div>
  )
}

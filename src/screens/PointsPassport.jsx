import React, { useState } from 'react'
import { Btn, Card, CardBody, FieldSelect, FieldInput, FieldLabel } from '../components/UI'
import {
  SEASONS, DESTINATIONS, PACKAGES, FRACTIONAL_PACKAGES, BANKING_YEARS,
} from '../lib/pointsPassportConfig'
import {
  pointsForStay, destBreakdown, totalPoints, matchInCatalog, bankedMatch,
  currentPointsOwned, currentPackageLabel, currentPackage,
  availableRoomTypes, defaultRoomFor, guestRoomTypeList,
  nightsVal, tripsVal, roomLabel, fmt,
} from '../lib/pointsEngine'
import { savePointsSurvey } from '../lib/supabase'

// ── static option lists ──────────────────────────────────────
const OWNERSHIP_OPTIONS = [
  { id: 'points', t: 'Points Member', d: 'Owns a points-based membership' },
  { id: 'fractional', t: 'Fractional Owner', d: 'Owns a fractional share' },
  { id: 'none', t: 'Not an owner yet', d: 'First-time prospect' },
]
const FREQ_OPTIONS = [
  { id: 'annual', t: 'Full package', d: 'Points every year' },
  { id: 'biannual', t: 'Bi-Annual', d: 'Points every other year' },
]
const GROUP_OPTIONS = [
  { id: 'solo', t: 'Just me', d: 'Traveling solo', suggest: 'studio' },
  { id: 'couple', t: 'As a couple', d: 'Two travelers', suggest: 'one_bed' },
  { id: 'family', t: 'Couple + kids', d: 'Family stays', suggest: 'two_bed' },
  { id: 'group', t: 'Extended family or friends', d: 'Larger group trips', suggest: 'four_bed' },
]
const TRIP_OPTIONS = [
  { id: '1', t: '1 trip', d: 'Once a year' },
  { id: '2', t: '2 trips', d: 'Twice a year' },
  { id: '3', t: '3 trips', d: 'A few times a year' },
  { id: '4', t: '4 or more', d: 'Frequent traveler' },
  { id: 'custom', t: 'Custom', d: 'Enter a number' },
]
const LENGTH_OPTIONS = [
  { id: '3', t: 'Long weekend', d: '3 nights' },
  { id: '7', t: 'One week', d: '7 nights' },
  { id: '14', t: 'Two weeks', d: '14 nights' },
  { id: 'custom', t: 'Custom', d: 'Enter nights' },
]
const TRAVEL_STEPS = ['trips', 'group', 'season', 'length', 'accommodation', 'dest']

function freshResponses() {
  return {
    guestId: null,
    guestName: '',
    date: new Date().toISOString().slice(0, 10),
    ownership: null,
    currentPackageId: null,
    pointsElite: false,
    packageFrequency: 'annual',
    trips: null,
    tripsCustom: '',
    group: null,
    season: null,
    length: null,
    lengthCustom: '',
    accommodation: null,
    dest: {},
  }
}

function getSteps(responses) {
  const steps = ['ownership']
  if (responses.ownership === 'points') steps.push('currentPoints')
  if (responses.ownership === 'fractional') steps.push('currentFractional')
  return steps.concat(TRAVEL_STEPS)
}

function canProceed(screen, responses) {
  if (screen === 'ownership') return !!responses.ownership
  if (screen === 'currentPoints' || screen === 'currentFractional') return !!responses.currentPackageId
  if (screen === 'trips') return !!responses.trips && (responses.trips !== 'custom' || parseFloat(responses.tripsCustom) > 0)
  if (screen === 'group') return !!responses.group
  if (screen === 'season') return !!responses.season
  if (screen === 'length') return !!responses.length && (responses.length !== 'custom' || parseFloat(responses.lengthCustom) > 0)
  if (screen === 'accommodation') return !!responses.accommodation
  if (screen === 'dest') return Object.keys(responses.dest).length > 0
  return true
}

// ── small building blocks ────────────────────────────────────

function ChipGrid({ options, selected, onPick, columns = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {options.map(o => {
        const sel = selected === o.id
        return (
          <button key={o.id} onClick={() => onPick(o.id)} style={{
            textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
            border: `1px solid ${sel ? 'var(--ocean)' : 'var(--border2)'}`,
            background: sel ? 'var(--ocean-light)' : 'white',
            borderRadius: 12, padding: '13px 15px',
            display: 'flex', flexDirection: 'column', gap: 3, transition: 'all .15s',
          }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: sel ? 'var(--ocean)' : 'var(--ink)' }}>{o.t}</span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{o.d}</span>
          </button>
        )
      })}
    </div>
  )
}

function ToggleCard({ title, desc, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
      border: `1px solid ${active ? 'var(--ocean)' : 'var(--border2)'}`,
      background: active ? 'var(--ocean-light)' : 'white',
      borderRadius: 12, padding: '13px 15px', marginBottom: 14,
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ fontWeight: 600, fontSize: 13.5, color: active ? 'var(--ocean)' : 'var(--ink)' }}>{title}</span>
      <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{desc}</span>
    </button>
  )
}

function CustomNumberRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number" min="0" value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 100, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border2)',
          background: 'var(--sand)', color: 'var(--ink)', fontSize: 13, outline: 'none',
        }}
      />
    </div>
  )
}

function StepHead({ index, total, question, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 8 }}>
        Question {index + 1} of {total}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>{question}</h2>
      {hint && <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: 0, maxWidth: '54ch', lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

function StepNav({ idx, disabled, isLast, onBack, onNext }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      {idx > 0 && (
        <Btn variant="ghost" onClick={onBack}><i className="ti ti-arrow-left" /> Back</Btn>
      )}
      <Btn variant="ocean" onClick={onNext} disabled={disabled} style={{ flex: 1, justifyContent: 'center' }}>
        {isLast ? 'See recommendation' : 'Continue'} <i className="ti ti-arrow-right" />
      </Btn>
    </div>
  )
}

const stepBtnStyle = {
  width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--sand)',
  color: 'var(--ink)', cursor: 'pointer', fontSize: 15, lineHeight: 1,
}

// ── destination picker ───────────────────────────────────────

function DestRow({ d, sel, responses, onToggle, onRoomChange, onTpyChange }) {
  const isSel = !!sel
  const avail = isSel ? availableRoomTypes(responses, d.tier) : []
  const perStay = isSel ? pointsForStay(responses, d.tier, sel.room, responses.season, nightsVal(responses)) : 0
  return (
    <div style={{
      border: `1px solid ${isSel ? 'var(--ocean)' : 'var(--border)'}`, borderRadius: 12,
      padding: '12px 14px', background: 'white', marginBottom: 8,
    }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: `1.5px solid ${isSel ? 'var(--ocean)' : 'var(--border2)'}`, background: isSel ? 'var(--ocean)' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSel && <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />}
          </div>
          <div style={{ fontWeight: 500, fontSize: 13.5 }}>{d.name}</div>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: .5, flexShrink: 0 }}>{d.tier}</div>
      </div>
      {isSel && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
          <FieldLabel>Room type</FieldLabel>
          <FieldSelect
            value={sel.room}
            onChange={onRoomChange}
            options={avail.map(rt => ({ value: rt.id, label: `${rt.label} (sleeps ${rt.pax})` }))}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onTpyChange(Math.max(1, sel.tpy - 1))} style={stepBtnStyle}>−</button>
              <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>trips/yr</span>
              <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center', fontSize: 13 }}>{sel.tpy}</span>
              <button onClick={() => onTpyChange(sel.tpy + 1)} style={stepBtnStyle}>+</button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ocean)' }}>{fmt(perStay * sel.tpy)} pts</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── results sub-sections ─────────────────────────────────────

function CatalogSection({ group, responses, total, current, matches }) {
  const isCurrentType = responses.ownership === group.key
  const baseline = isCurrentType ? current : 0
  const gapHere = Math.max(0, total - baseline)
  const m = matchInCatalog(group.list, total)
  matches[group.key] = m

  const topPts = m.hit ? m.hit.pts : (m.overTop ? m.overTop.pts : null)
  const banked = bankedMatch(group.list, total, BANKING_YEARS)
  const showBanked = banked && (topPts === null || banked.pts < topPts)
  const curLabel = currentPackageLabel(responses, PACKAGES, FRACTIONAL_PACKAGES)

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginBottom: 3 }}>{group.label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 12 }}>Where this guest's wish list lands</div>

      {isCurrentType && gapHere <= 0 && baseline > 0 && (
        <div style={{ border: '1px dashed var(--ocean)', background: 'var(--ocean-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, fontSize: 13, color: 'var(--ink2)' }}>
          Their current <strong>{curLabel}</strong> package already covers this wish list, with <strong style={{ color: 'var(--ocean)' }}>{fmt(baseline - total)}</strong> points to spare — no upgrade needed unless their plans grow.
        </div>
      )}

      {!(isCurrentType && gapHere <= 0 && baseline > 0) && m.hit && (
        <>
          <div style={{ borderRadius: 14, padding: 18, border: '1.5px solid var(--ocean)', background: 'var(--ocean-light)', marginBottom: 12 }}>
            <span style={{ display: 'inline-block', background: 'var(--ocean)', color: 'white', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, padding: '3px 9px', borderRadius: 999, marginBottom: 8 }}>
              {isCurrentType ? 'Upgrade to' : 'Recommended'}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 3 }}>{m.hit.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
              {group.label} — <strong style={{ color: 'var(--ocean)' }}>{fmt(m.hit.pts)}</strong> points/year
              {isCurrentType && baseline > 0
                ? <> — adds <strong style={{ color: 'var(--ocean)' }}>{fmt(m.hit.pts - baseline)}</strong> points over their current {curLabel}</>
                : <> — <strong style={{ color: 'var(--ocean)' }}>{fmt(m.hit.pts - total)}</strong> to spare for extra stays</>}
            </div>
          </div>
          {m.next && (
            <div style={{ border: '1px dashed var(--gold)', background: 'var(--gold-light)', borderRadius: 12, padding: '13px 16px', marginBottom: 14, fontSize: 12.5, color: 'var(--ink2)' }}>
              Just <strong style={{ color: 'var(--gold)' }}>{fmt(m.next.pts - total)}</strong> more points/year reaches <strong>{m.next.name}</strong> ({fmt(m.next.pts)} pts) — worth mentioning if their travel plans might grow.
            </div>
          )}
        </>
      )}

      {!(isCurrentType && gapHere <= 0 && baseline > 0) && !m.hit && m.overTop && (
        <div style={{ border: '1px dashed var(--rose)', background: 'var(--rose-light)', borderRadius: 12, padding: '13px 16px', marginBottom: 14, fontSize: 12.5, color: 'var(--ink2)' }}>
          This wish list needs <strong style={{ color: 'var(--rose)' }}>{fmt(total - m.overTop.pts)}</strong> more points/year than <strong>{m.overTop.name}</strong> ({fmt(m.overTop.pts)} pts) covers — {group.key === 'fractional' ? 'worth discussing an additional share.' : 'worth discussing a top-up, or trimming the wish list slightly.'}
        </div>
      )}

      {showBanked && (
        <div style={{ border: '1px dashed var(--border2)', background: 'var(--sand)', borderRadius: 12, padding: '13px 16px', marginBottom: 14, fontSize: 12.5, color: 'var(--ink2)' }}>
          Prefer a lighter start? The <strong>{banked.name}</strong> ({fmt(banked.pts)} pts/year) covers this wish list too, if points are banked over up to <strong>{BANKING_YEARS}</strong> year{BANKING_YEARS === 1 ? '' : 's'} instead of spent fresh every year — a lower-commitment option alongside the recommendation above.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
        {m.sorted.map(p => {
          const isCurrent = responses.currentPackageId === p.id && isCurrentType
          const hit = m.hit && m.hit.id === p.id
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '9px 13px', borderRadius: 10, fontSize: 12.5,
              border: `1px solid ${hit ? 'var(--ocean)' : 'var(--border)'}`,
              background: hit ? 'var(--ocean-light)' : 'white',
            }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.name}
                {isCurrent && (
                  <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 700, background: 'var(--gold)', color: 'white', padding: '2px 7px', borderRadius: 999 }}>Current</span>
                )}
              </span>
              <span style={{ color: 'var(--ink3)', flexShrink: 0 }}>{fmt(p.pts)} pts</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── main screen ───────────────────────────────────────────────

export function PointsPassportScreen({ guests, addGuest, onGoToGuest }) {
  const [screen, setScreen] = useState('start')
  const [responses, setResponses] = useState(freshResponses)
  const [destFilter, setDestFilter] = useState('')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [copyState, setCopyState] = useState('idle')

  const patch = (fields) => setResponses(prev => ({ ...prev, ...fields }))

  const steps = getSteps(responses)
  const idx = steps.indexOf(screen)

  const goNext = () => {
    if (!canProceed(screen, responses)) return
    if (idx < steps.length - 1) setScreen(steps[idx + 1])
    else setScreen('results')
  }
  const goBack = () => { if (idx > 0) setScreen(steps[idx - 1]) }
  const startOver = () => { setResponses(freshResponses()); setDestFilter(''); setScreen('start'); setSaveState('idle'); setCopyState('idle') }

  // ── start screen ──
  if (screen === 'start') {
    const guestOptions = [{ value: '', label: '— New prospect (not yet a guest) —' }, ...guests.map(g => ({ value: g.id, label: g.name }))]
    return (
      <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
        <div style={{ maxWidth: 420, margin: '20px auto 0', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: 16, background: 'linear-gradient(155deg, var(--ocean), var(--ocean-ink, #12414c))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-map-pin-check" style={{ fontSize: 26, color: 'white' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 500, margin: '0 0 8px' }}>Points Passport</h2>
          <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: '0 auto 26px', lineHeight: 1.6 }}>
            A short conversation about how they travel — so you can show them exactly which membership fits, in real Karma points.
          </p>
          <div style={{ textAlign: 'left' }}>
            <FieldLabel>Existing guest (optional)</FieldLabel>
            <FieldSelect
              value={responses.guestId || ''}
              onChange={v => {
                const g = guests.find(x => x.id === v)
                patch({ guestId: v || null, guestName: g ? g.name : responses.guestName })
              }}
              options={guestOptions}
            />
            <FieldLabel>Guest name</FieldLabel>
            <FieldInput value={responses.guestName} onChange={v => patch({ guestName: v })} placeholder="e.g. Mr. & Mrs. Harmon" />
            <Btn variant="ocean" onClick={goNext} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
              Begin survey <i className="ti ti-arrow-right" />
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  // ── results screen ──
  if (screen === 'results') {
    const total = totalPoints(responses, DESTINATIONS)
    const current = currentPointsOwned(responses, PACKAGES, FRACTIONAL_PACKAGES)
    const gap = Math.max(0, total - current)
    const isOwner = responses.ownership === 'points' || responses.ownership === 'fractional'
    const curPkg = currentPackage(responses, PACKAGES, FRACTIONAL_PACKAGES)
    const curLabel = currentPackageLabel(responses, PACKAGES, FRACTIONAL_PACKAGES)
    const rows = destBreakdown(responses, DESTINATIONS)
    const matches = {}

    const statusLabel = responses.ownership === 'points'
      ? `Points Member${responses.pointsElite ? ' (Elite)' : ''}`
      : responses.ownership === 'fractional' ? 'Fractional Owner' : null

    let eliteDiff = 0
    if (responses.ownership === 'points') {
      const eliteAlt = totalPoints(responses, DESTINATIONS, !responses.pointsElite)
      eliteDiff = Math.round((eliteAlt - total) * 10) / 10
    }

    const gname = (GROUP_OPTIONS.find(x => x.id === responses.group) || {}).t || '—'
    const sname = (SEASONS.find(x => x.id === responses.season) || {}).label || '—'
    const aname = roomLabel(responses.accommodation)
    const lname = responses.length === 'custom' ? `${responses.lengthCustom} nights` : (LENGTH_OPTIONS.find(x => x.id === responses.length) || {}).t
    const ownName = ((OWNERSHIP_OPTIONS.find(x => x.id === responses.ownership) || {}).t || '—') + (responses.ownership === 'points' && responses.pointsElite ? ' (Elite)' : '')

    const groups = [
      { key: 'points', label: 'Points Membership', list: PACKAGES },
      { key: 'fractional', label: 'Fractional Ownership', list: FRACTIONAL_PACKAGES },
    ]
    // pre-compute matches for save/copy actions by rendering the catalog sections once here isn't
    // possible before JSX, so CatalogSection fills `matches` as a side effect during render below.

    const buildSummaryText = () => {
      const matchLine = (m) => {
        if (!m) return '—'
        if (m.hit) return `${m.hit.name} (${fmt(m.hit.pts)} pts)`
        if (m.overTop) return `${m.overTop.name} (over)`
        return '—'
      }
      const lines = [
        `${responses.guestName || 'Guest'} — ${responses.date}`,
        `Status: ${ownName}${isOwner ? ` — currently owns ${curLabel} (${fmt(current)} pts/yr)` : ''}`,
        `Total needed: ${fmt(total)} pts/year`,
        `Points Membership: ${matchLine(matches.points)}`,
        `Fractional Ownership: ${matchLine(matches.fractional)}`,
        '',
        'Destinations:',
      ]
      rows.forEach(row => lines.push(`  ${row.dest.name} (${roomLabel(row.room)}) — ${row.tpy}x, ${fmt(row.nights)}n, ${fmt(row.subtotal)} pts`))
      return lines.join('\n')
    }

    const handleCopy = () => {
      const text = buildSummaryText()
      navigator.clipboard.writeText(text).then(() => {
        setCopyState('copied')
        setTimeout(() => setCopyState('idle'), 2000)
      }).catch(() => setCopyState('error'))
    }

    const handleSave = async () => {
      setSaveState('saving')
      try {
        let guestId = responses.guestId
        if (!guestId && responses.guestName.trim()) {
          const created = await addGuest({
            name: responses.guestName.trim(),
            membership: matches.points?.hit?.name || matches.fractional?.hit?.name || curLabel,
            member_type: responses.ownership === 'fractional' ? 'Fractional Owner' : responses.ownership === 'points' ? 'Points Member' : 'Prospect',
            status: 'Follow-Up',
            notes: buildSummaryText(),
          })
          guestId = created.id
          patch({ guestId })
        }
        await savePointsSurvey({
          guest_id: guestId || null,
          guest_name: responses.guestName || 'Unnamed guest',
          ownership: responses.ownership,
          current_package: isOwner ? curLabel : null,
          total_points: total,
          recommended_points_package: matches.points?.hit?.name || (matches.points?.overTop ? matches.points.overTop.name + ' +' : null),
          recommended_fractional_package: matches.fractional?.hit?.name || (matches.fractional?.overTop ? matches.fractional.overTop.name + ' +' : null),
          responses: { ...responses, breakdown: rows.map(r => ({ dest: r.dest.name, room: r.room, nights: r.nights, tpy: r.tpy, subtotal: r.subtotal })) },
        })
        setSaveState('saved')
      } catch (e) {
        console.error(e)
        setSaveState('error')
      }
    }

    return (
      <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', padding: '4px 0 22px' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 6 }}>
              {responses.guestName || 'Guest profile'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 46, color: 'var(--ocean)', lineHeight: 1 }}>
              {fmt(total)}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink3)', marginLeft: 6 }}>points / year needed</span>
            </div>
          </div>

          {isOwner && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', border: '1px solid var(--border)', background: 'white', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
                {[
                  ['Current status', statusLabel],
                  ['Current package', curLabel],
                  [responses.ownership === 'points' && responses.packageFrequency === 'biannual' ? 'Owns (annual avg)' : 'Currently owns', `${fmt(current)} pts/yr`],
                  [gap > 0 ? 'Points short' : 'Spare capacity', `${fmt(gap > 0 ? gap : (current - total))} pts`],
                ].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--ink3)' }}>{l}</div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 2, color: l.includes('short') ? 'var(--rose)' : 'var(--ink)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {responses.ownership === 'points' && responses.packageFrequency === 'biannual' && curPkg && (
                <p style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'center', marginTop: -8, marginBottom: 18 }}>
                  Bi-Annual packages allocate {fmt(curPkg.pts)} points every other year — figures above show the annual average ({fmt(curPkg.pts / 2)} pts/yr) for comparison against this wish list.
                </p>
              )}
            </>
          )}

          {responses.ownership === 'points' && eliteDiff !== 0 && (
            <div style={{ border: '1px dashed var(--gold)', background: 'var(--gold-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: 'var(--ink2)' }}>
              {responses.pointsElite
                ? (eliteDiff > 0
                  ? <>Their <strong>Points Elite</strong> flat rate is saving them <strong style={{ color: 'var(--gold)' }}>{fmt(eliteDiff)}</strong> points/year on this wish list versus standard tier-based pricing.</>
                  : <>On this particular wish list, standard tier-based pricing would actually cost <strong style={{ color: 'var(--gold)' }}>{fmt(-eliteDiff)}</strong> fewer points/year than Elite — worth a quick sanity check on the resort mix.</>)
                : (eliteDiff < 0
                  ? <>Upgrading to <strong>Points Elite</strong> would cost <strong style={{ color: 'var(--gold)' }}>{fmt(-eliteDiff)}</strong> fewer points/year on this exact wish list — worth mentioning given the resorts on it.</>
                  : <>On this wish list, <strong>Points Elite</strong>'s flat rate would cost <strong style={{ color: 'var(--gold)' }}>{fmt(eliteDiff)}</strong> more points/year than standard pricing — not the right upsell here.</>)}
            </div>
          )}

          {groups.map(group => (
            <CatalogSection key={group.key} group={group} responses={responses} total={total} current={current} matches={matches} />
          ))}

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '4px 0 12px' }}>Destination breakdown</div>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Destination', 'Room', 'Nights', 'Pts/stay', 'Trips/yr', 'Subtotal'].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left', fontWeight: 600, color: 'var(--ink3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .5, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)' }}>{row.dest.name}</td>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)' }}>{roomLabel(row.room)}</td>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.nights)}</td>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.perStay)}</td>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{row.tpy}</td>
                    <td style={{ padding: '9px 8px 9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt(row.subtotal)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '9px 8px 9px 0', fontWeight: 700, borderBottom: '2px solid var(--border2)' }}>Total</td>
                  <td style={{ borderBottom: '2px solid var(--border2)' }} /><td style={{ borderBottom: '2px solid var(--border2)' }} /><td style={{ borderBottom: '2px solid var(--border2)' }} /><td style={{ borderBottom: '2px solid var(--border2)' }} />
                  <td style={{ padding: '9px 8px 9px 0', fontWeight: 700, textAlign: 'right', borderBottom: '2px solid var(--border2)' }}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '4px 0 12px' }}>Profile recap</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 24 }}>
            {[
              ['Ownership status', ownName],
              ['Current package', isOwner ? curLabel : '—'],
              ['Trips / year', responses.trips === 'custom' ? responses.tripsCustom : responses.trips],
              ['Travels with', gname],
              ['Preferred season', sname],
              ['Typical trip length', lname],
              ['Default room type', aname],
              ['Date', responses.date],
            ].map(([l, v]) => (
              <div key={l} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 13px', background: 'white' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--ink3)', marginBottom: 3 }}>{l}</div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          <Card style={{ marginBottom: 20 }}>
            <CardBody>
              <FieldLabel>Link to guest</FieldLabel>
              <FieldSelect
                value={responses.guestId || ''}
                onChange={v => patch({ guestId: v || null })}
                options={[{ value: '', label: responses.guestName ? `Create new guest: ${responses.guestName}` : '— New prospect —' }, ...guests.map(g => ({ value: g.id, label: g.name }))]}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <Btn variant="ocean" onClick={handleSave} disabled={saveState === 'saving'}>
                  <i className="ti ti-device-floppy" /> {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved to CRM' : 'Save to CRM'}
                </Btn>
                <Btn variant="ghost" onClick={handleCopy}>
                  <i className={`ti ti-${copyState === 'copied' ? 'check' : 'copy'}`} /> {copyState === 'copied' ? 'Copied!' : 'Copy summary'}
                </Btn>
                <Btn variant="ghost" onClick={startOver}>
                  <i className="ti ti-refresh" /> New survey
                </Btn>
                {saveState === 'saved' && responses.guestId && onGoToGuest && (
                  <Btn variant="amber" onClick={() => onGoToGuest(responses.guestId)}>
                    <i className="ti ti-user" /> View guest profile
                  </Btn>
                )}
              </div>
              {saveState === 'error' && (
                <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 10, marginBottom: 0 }}>Could not save — check the Supabase connection and try again.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  // ── survey steps ──
  const stepIdx = idx
  const stepTotal = steps.length
  const progressPct = ((stepIdx) / (stepTotal - 1)) * 92 + 4

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 22, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--ocean)', transition: 'width .3s' }} />
        </div>

        {screen === 'ownership' && (
          <>
            <StepHead index={stepIdx} total={stepTotal} question="Are they already a Karma owner?" hint="This decides which package list comes up next, and lets us show an upgrade path if they already own something." />
            <ChipGrid options={OWNERSHIP_OPTIONS} selected={responses.ownership} onPick={id => {
              const resetOwnership = responses.ownership !== id ? { currentPackageId: null, pointsElite: false, packageFrequency: 'annual' } : {}
              patch({ ownership: id, ...resetOwnership })
            }} />
          </>
        )}

        {(screen === 'currentPoints' || screen === 'currentFractional') && (() => {
          const isPoints = screen === 'currentPoints'
          const list = isPoints ? PACKAGES : FRACTIONAL_PACKAGES
          const label = isPoints ? 'points-membership package' : 'fractional share'
          return (
            <>
              <StepHead index={stepIdx} total={stepTotal} question={`Which ${label} do they currently own?`} hint="Their current points will be compared against what their travel wish list needs." />
              <ChipGrid options={list.map(p => ({ id: p.id, t: p.name, d: `${fmt(p.pts)} pts/year` }))} selected={responses.currentPackageId} onPick={id => patch({ currentPackageId: id })} />
              {isPoints && (
                <>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--ink3)', margin: '20px 0 8px' }}>Package frequency</div>
                  <ChipGrid options={FREQ_OPTIONS} selected={responses.packageFrequency} onPick={id => patch({ packageFrequency: id })} />
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--ink3)', margin: '20px 0 8px' }}>Membership status</div>
                  <ToggleCard
                    title="Points Elite"
                    desc="Flat points rate everywhere — resort grade doesn't change the cost"
                    active={responses.pointsElite}
                    onClick={() => patch({ pointsElite: !responses.pointsElite })}
                  />
                </>
              )}
            </>
          )
        })()}

        {screen === 'trips' && (
          <>
            <StepHead index={stepIdx} total={stepTotal} question={`How many trips does ${responses.guestName || 'your family'} take a year?`} hint="Roughly — we can always adjust later." />
            <ChipGrid options={TRIP_OPTIONS} selected={responses.trips} onPick={id => patch({ trips: id })} />
            {responses.trips === 'custom' && (
              <CustomNumberRow label="Trips / year" value={responses.tripsCustom} onChange={v => patch({ tripsCustom: v })} />
            )}
          </>
        )}

        {screen === 'group' && (
          <>
            <StepHead index={stepIdx} total={stepTotal} question="Who usually travels with you?" hint="This helps us suggest the right unit size." />
            <ChipGrid options={GROUP_OPTIONS} selected={responses.group} onPick={id => {
              const g = GROUP_OPTIONS.find(x => x.id === id)
              patch({ group: id, accommodation: responses.accommodation || (g ? g.suggest : responses.accommodation) })
            }} />
          </>
        )}

        {screen === 'season' && (
          <>
            <StepHead index={stepIdx} total={stepTotal} question="When do you usually like to travel?" hint="This is the Karma Club season band — it decides how many points a stay costs." />
            <ChipGrid options={SEASONS.map(s => ({ id: s.id, t: s.label, d: s.hint }))} selected={responses.season} onPick={id => patch({ season: id })} />
          </>
        )}

        {screen === 'length' && (
          <>
            <StepHead index={stepIdx} total={stepTotal} question="How long is a typical trip?" hint="Nights per stay, on average." />
            <ChipGrid options={LENGTH_OPTIONS} selected={responses.length} onPick={id => patch({ length: id })} />
            {responses.length === 'custom' && (
              <CustomNumberRow label="Nights" value={responses.lengthCustom} onChange={v => patch({ lengthCustom: v })} />
            )}
          </>
        )}

        {screen === 'accommodation' && (() => {
          const capNote = responses.ownership === 'fractional' ? 'Fractional owners can book up to a Four Bedroom.' : 'Points members can book up to a Two Bedroom.'
          return (
            <>
              <StepHead index={stepIdx} total={stepTotal} question="What size unit do they usually book?" hint={`${capNote} Used as the default for every destination below — you can still change it per destination.`} />
              <ChipGrid options={guestRoomTypeList(responses).map(rt => ({ id: rt.id, t: rt.label, d: `Sleeps up to ${rt.pax}` }))} selected={responses.accommodation} onPick={id => patch({ accommodation: id })} />
            </>
          )
        })()}

        {screen === 'dest' && (() => {
          const q = destFilter.trim().toLowerCase()
          const byTier = {}
          DESTINATIONS.forEach(d => {
            if (q && !d.name.toLowerCase().includes(q)) return
            if (!byTier[d.tier]) byTier[d.tier] = []
            byTier[d.tier].push(d)
          })
          const tierOrder = ['Emerald', 'Titanium', 'Platinum', 'Silver']
          const total = totalPoints(responses, DESTINATIONS)
          const allocated = Object.keys(responses.dest).reduce((a, id) => a + responses.dest[id].tpy, 0)
          const target = tripsVal(responses)

          const toggleDest = (d) => {
            const next = { ...responses.dest }
            if (next[d.id]) delete next[d.id]
            else next[d.id] = { room: defaultRoomFor(responses, d.tier), tpy: 1 }
            patch({ dest: next })
          }
          const updateDest = (id, fields) => {
            patch({ dest: { ...responses.dest, [id]: { ...responses.dest[id], ...fields } } })
          }

          return (
            <>
              <StepHead index={stepIdx} total={stepTotal} question="Where do they want to use their points?" hint="Select every destination on their wish list, then check the room type and set trips a year for each." />
              <input
                type="text" placeholder="Search properties…" value={destFilter}
                onChange={e => setDestFilter(e.target.value)}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border2)',
                  background: 'var(--sand)', color: 'var(--ink)', fontSize: 13, marginBottom: 16, outline: 'none',
                }}
              />
              {tierOrder.filter(t => byTier[t]).map(tier => (
                <div key={tier}>
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--ink3)', margin: '16px 0 8px' }}>{tier}</div>
                  {byTier[tier].map(d => (
                    <DestRow
                      key={d.id} d={d} sel={responses.dest[d.id]} responses={responses}
                      onToggle={() => toggleDest(d)}
                      onRoomChange={v => updateDest(d.id, { room: v })}
                      onTpyChange={v => updateDest(d.id, { tpy: v })}
                    />
                  ))}
                </div>
              ))}
              {!tierOrder.some(t => byTier[t]) && (
                <p style={{ fontSize: 12.5, color: 'var(--ink3)' }}>No properties match "{destFilter}".</p>
              )}

              <div style={{ marginTop: 18, padding: '13px 16px', borderRadius: 12, background: 'var(--ocean-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, color: 'var(--ocean)', textTransform: 'uppercase', letterSpacing: .5 }}>Annual points so far</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ocean)' }}>{fmt(total)}</span>
              </div>
              {target > 0 && allocated !== target && (
                <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 8 }}>
                  Picks so far add up to {allocated} trip(s)/year, vs. the {target} they mentioned earlier — adjust the steppers above, or that's fine if plans are still flexible.
                </p>
              )}
            </>
          )
        })()}

        <StepNav idx={stepIdx} disabled={!canProceed(screen, responses)} isLast={screen === 'dest'} onBack={goBack} onNext={goNext} />
      </div>
    </div>
  )
}

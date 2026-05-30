import React, { useState } from 'react'
import { Btn, AIOutputBox, FieldInput, FieldTextarea, FieldSelect, FieldLabel, SliderField, Card, CardHeader, CardBody, SectionHeader } from '../components/UI'
import { useAI } from '../hooks/useAI'
import { saveObjectionResponse } from '../lib/supabase'

// ── OBJECTION HANDLER ─────────────────────────────────────────
const PRESET_OBJECTIONS = [
  { emoji: '💰', label: 'Fees too high', text: 'Maintenance fees are too expensive' },
  { emoji: '🏖', label: 'Never use it', text: 'I never use my membership' },
  { emoji: '🏨', label: 'Hotels cheaper', text: 'I can get better value booking hotels directly' },
  { emoji: '⏰', label: 'Not the right time', text: "The timing isn't right for us" },
  { emoji: '👫', label: 'Need to discuss', text: 'I need to speak to my partner first' },
  { emoji: '❌', label: 'Not interested', text: "I'm not interested in an upgrade" },
  { emoji: '💸', label: 'Price too high', text: 'The fractional ownership price is too high' },
  { emoji: '🔄', label: 'Exit concerns', text: "I'm worried about exit and resale value" },
]

const TONES = [
  'Warm & empathetic — hospitality-first',
  'Educational — facts and comparisons',
  'Direct — confident and value-focused',
  'Soft close — end with a next step',
]

export function ObjectionScreen() {
  const [objection, setObjection] = useState('')
  const [context, setContext] = useState('')
  const [tone, setTone] = useState(TONES[0])
  const ai = useAI()

  const handleGenerate = async () => {
    const text = await ai.objection(objection, context, tone)
    if (text) {
      await saveObjectionResponse({ objection, context, tone, response: text }).catch(() => {})
    }
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="AI Objection Handler" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 18 }}>
        Select a preset objection or type a custom one. AI generates a warm, tailored response.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {PRESET_OBJECTIONS.map(o => (
          <button key={o.text} onClick={() => setObjection(o.text)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            background: objection === o.text ? 'var(--ocean)' : 'white',
            color: objection === o.text ? 'white' : 'var(--ink2)',
            border: `1px solid ${objection === o.text ? 'var(--ocean)' : 'var(--border2)'}`,
            transition: 'all .15s',
          }}>
            {o.emoji} {o.label}
          </button>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <FieldLabel>Objection</FieldLabel>
          <FieldInput value={objection} onChange={setObjection} placeholder="Type the guest's exact objection..." />
          <FieldLabel>Guest Context (optional)</FieldLabel>
          <FieldTextarea value={context} onChange={setContext} placeholder="e.g. Legacy member, 198 points, hasn't visited in 3 years, family of 4..." rows={3} />
          <FieldLabel>Tone</FieldLabel>
          <FieldSelect value={tone} onChange={setTone} options={TONES} />
          <Btn variant="ocean" onClick={handleGenerate} disabled={ai.loading || !objection.trim()} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="ti ti-sparkles" /> Generate Response
          </Btn>
        </CardBody>
      </Card>

      <AIOutputBox output={ai.output} loading={ai.loading} onRegenerate={handleGenerate} />
    </div>
  )
}

// ── FEE CALCULATOR ────────────────────────────────────────────
export function CalculatorScreen() {
  const [points, setPoints] = useState(231)
  const [inflation, setInflation] = useState(6.8)
  const [stays, setStays] = useState(1)
  const [nights, setNights] = useState(7)
  const [hotelRate, setHotelRate] = useState(650)

  const fee = Math.round(points * 6.02 + 382)

  let total5 = 0, total10 = 0, total25 = 0, hotelTotal10 = 0
  const rows = []
  for (let y = 1; y <= 25; y++) {
    const yFee = Math.round(fee * Math.pow(1 + inflation / 100, y - 1))
    const hVal = Math.round(hotelRate * nights * stays)
    if (y <= 5) total5 += yFee
    if (y <= 10) { total10 += yFee; hotelTotal10 += hVal }
    total25 += yFee
    if (y <= 10) rows.push({ year: y, fee: yFee, hotel: hVal })
  }

  const fmt = (n) => '$' + Math.round(n).toLocaleString()

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Maintenance Fee Calculator" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20 }}>
        Project the true long-term cost to help guests understand their investment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <Card>
          <CardHeader title="Inputs" />
          <CardBody>
            <SliderField label="Points" value={points} min={50} max={1000} step={1} onChange={setPoints} format={v => v + ' pts'} />
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 12 }}>Current fee: <strong>${fee.toLocaleString()}</strong> ({points} × $6.02 + $382)</div>
            <SliderField label="Annual Inflation" value={inflation} min={1} max={10} step={0.1} onChange={setInflation} format={v => v + '%'} />
            <SliderField label="Stays Per Year" value={stays} min={0} max={8} onChange={setStays} />
            <SliderField label="Nights Per Stay" value={nights} min={1} max={21} onChange={setNights} />
            <SliderField label="Hotel Equivalent Rate" value={hotelRate} min={100} max={2500} step={50} onChange={setHotelRate} format={v => '$' + v + '/night'} />
          </CardBody>
        </Card>

        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: '5 Year Total', val: fmt(total5), sub: 'fees paid', grad: 'linear-gradient(135deg,var(--ocean),#1A7A8F)' },
              { label: '10 Year Total', val: fmt(total10), sub: `vs ${fmt(hotelTotal10)} hotels`, grad: 'linear-gradient(135deg,#1A5F6E,#2D5A3D)' },
              { label: '25 Year Total', val: fmt(total25), sub: 'total projection', grad: 'linear-gradient(135deg,var(--palm),#1A3D2A)' },
            ].map(c => (
              <div key={c.label} style={{ background: c.grad, color: 'white', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, opacity: .7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{c.val}</div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 3 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="Year-by-Year (10 years)" />
            <CardBody style={{ padding: 0 }}>
              {rows.map(r => (
                <div key={r.year} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink3)' }}>Year {r.year}</span>
                  <span style={{ fontWeight: 500 }}>{fmt(r.fee)}</span>
                  <span style={{ fontSize: 11, color: 'var(--palm)' }}>hotel equiv: {fmt(r.hotel)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── FRACTIONAL COMPARISON ─────────────────────────────────────
export function ComparisonScreen() {
  const [cFee, setCFee] = useState(4200)
  const [cNights, setCNights] = useState(7)
  const [cExit, setCExit] = useState(0)
  const [fPrice, setFPrice] = useState(45000)
  const [fFee, setFFee] = useState(2800)
  const [fExit, setFExit] = useState(52000)

  const years = 10
  const cTotal = cFee * years - cExit
  const fTotal = fPrice + fFee * years - fExit
  const saving = cTotal - fTotal
  const fmt = (n) => '$' + Math.abs(Math.round(n)).toLocaleString()

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Fractional Ownership Comparison" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20 }}>
        Side-by-side 10-year comparison of current membership vs fractional ownership.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Current Membership" />
          <CardBody>
            <FieldLabel>Annual Maintenance Fee ($)</FieldLabel>
            <FieldInput value={cFee} onChange={v => setCFee(Number(v))} type="number" />
            <FieldLabel>Nights Per Year</FieldLabel>
            <FieldInput value={cNights} onChange={v => setCNights(Number(v))} type="number" />
            <FieldLabel>Resale / Exit Value ($)</FieldLabel>
            <FieldInput value={cExit} onChange={v => setCExit(Number(v))} type="number" />
          </CardBody>
        </Card>

        <Card style={{ border: '2px solid var(--ocean2)' }}>
          <CardHeader title={<span style={{ color: 'var(--ocean)' }}>Fractional Ownership</span>} />
          <CardBody>
            <FieldLabel>Purchase Price ($)</FieldLabel>
            <FieldInput value={fPrice} onChange={v => setFPrice(Number(v))} type="number" />
            <FieldLabel>Annual Maintenance Fee ($)</FieldLabel>
            <FieldInput value={fFee} onChange={v => setFFee(Number(v))} type="number" />
            <FieldLabel>Projected Exit Value in 10 years ($)</FieldLabel>
            <FieldInput value={fExit} onChange={v => setFExit(Number(v))} type="number" />
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <CardHeader title="10-Year Comparison" />
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'Current membership', rows: [
                ['Total fees paid', fmt(cFee * years), false],
                ['Exit / resale value', fmt(cExit), true],
                ['Net cost over 10 years', fmt(cTotal), false],
                ['Equity / ownership', '$0', false],
              ]},
              { label: 'Fractional ownership', rows: [
                ['Purchase price', fmt(fPrice), null],
                ['Total fees paid', fmt(fFee * years), false],
                ['Projected exit value', fmt(fExit), true],
                ['Net cost over 10 years', fmt(Math.max(0, fTotal)), fTotal < cTotal],
                ['Equity / ownership', 'Deeded title', true],
              ]},
            ].map(col => (
              <div key={col.label}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', marginBottom: 10 }}>{col.label}</div>
                {col.rows.map(([k, v, good]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--ink3)' }}>{k}</span>
                    <span style={{ fontWeight: 500, color: good === true ? 'var(--palm)' : good === false ? 'var(--rose)' : 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{
            background: saving > 0 ? 'var(--palm-light)' : 'var(--rose-light)',
            border: `1px solid ${saving > 0 ? 'rgba(45,90,61,.2)' : 'rgba(192,80,74,.2)'}`,
            borderRadius: 10, padding: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: saving > 0 ? 'var(--palm)' : 'var(--rose)', marginBottom: 4 }}>
              {saving > 0 ? 'Fractional saves over 10 years' : 'Current membership costs less'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: saving > 0 ? 'var(--palm)' : 'var(--rose)' }}>
              {fmt(saving)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              {saving > 0 ? 'plus you own an appreciating asset with deeded title' : 'factoring in purchase price and projected exit value'}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ── AI TOOLS SCREEN ───────────────────────────────────────────
const AI_TOOLS = [
  { id: 'welcome', icon: 'ti-message-2', color: 'var(--ocean)', bg: 'var(--ocean-light)', name: 'Welcome Generator', desc: 'Personalized welcome messages (WhatsApp & email) based on membership type, travel history and family details.' },
  { id: 'meetingprep', icon: 'ti-presentation', color: 'var(--amber)', bg: 'var(--amber-light)', name: 'Meeting Preparation', desc: 'AI briefing notes, talking points, and likely objections before you sit down with a guest.' },
  { id: 'followup', icon: 'ti-send', color: 'var(--palm)', bg: 'var(--palm-light)', name: 'Follow-Up Generator', desc: 'Type quick notes after a meeting — AI writes the professional follow-up instantly.' },
  { id: 'proposal', icon: 'ti-file-text', color: 'var(--gold)', bg: 'var(--gold-light)', name: 'Proposal Writer', desc: 'Tailored upgrade or fractional ownership proposals, personalized to each guest profile.' },
]

export function AIToolsScreen({ guests }) {
  const [activeTool, setActiveTool] = useState(null)
  const [guestId, setGuestId] = useState(guests[0]?.id || '')
  const [extra, setExtra] = useState('')
  const [msgFormat, setMsgFormat] = useState('whatsapp')
  const [propType, setPropType] = useState('Fractional Ownership — Standard Week')
  const ai = useAI()

  const selectedGuest = guests.find(g => g.id === guestId) || guests[0]

  const handleRun = async () => {
    if (!selectedGuest) return
    ai.clear()
    if (activeTool === 'welcome') {
      if (msgFormat === 'email') await ai.welcomeEmail(selectedGuest)
      else await ai.welcomeWhatsApp(selectedGuest)
    } else if (activeTool === 'meetingprep') {
      await ai.meetingPrep(selectedGuest, extra)
    } else if (activeTool === 'followup') {
      await ai.followUp(selectedGuest, extra, msgFormat)
    } else if (activeTool === 'proposal') {
      await ai.proposal(selectedGuest, propType, extra)
    }
  }

  const guestOptions = guests.map(g => ({ value: g.id, label: `${g.name} — ${g.membership}` }))

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="AI Communication Tools" right={
        activeTool && <Btn variant="ghost" size="sm" onClick={() => { setActiveTool(null); ai.clear() }}><i className="ti ti-arrow-left" /> All Tools</Btn>
      } />

      {!activeTool && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {AI_TOOLS.map(t => (
            <div key={t.id} onClick={() => setActiveTool(t.id)} style={{
              background: 'white', borderRadius: 14, border: '1px solid var(--border)',
              padding: 20, cursor: 'pointer', transition: 'all .18s', boxShadow: 'var(--shadow)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
                <i className={`ti ${t.icon}`} />
              </div>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 5 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.55 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      )}

      {activeTool && (
        <Card>
          <CardHeader title={AI_TOOLS.find(t => t.id === activeTool)?.name} />
          <CardBody>
            <FieldLabel>Select Guest</FieldLabel>
            <FieldSelect value={guestId} onChange={setGuestId} options={guestOptions} />

            {(activeTool === 'welcome' || activeTool === 'followup') && (
              <>
                <FieldLabel>Format</FieldLabel>
                <FieldSelect value={msgFormat} onChange={setMsgFormat} options={[{ value: 'whatsapp', label: 'WhatsApp Message' }, { value: 'email', label: 'Email' }]} />
              </>
            )}

            {activeTool === 'proposal' && (
              <>
                <FieldLabel>Proposal Type</FieldLabel>
                <FieldSelect value={propType} onChange={setPropType} options={['Fractional Ownership — Standard Week', 'Fractional Ownership — Premium Week', 'Membership Upgrade', 'Points Package Upgrade']} />
              </>
            )}

            {activeTool !== 'welcome' && (
              <>
                <FieldLabel>{activeTool === 'meetingprep' ? 'Additional Context' : activeTool === 'followup' ? 'Meeting Notes' : 'Key Benefits to Highlight'}</FieldLabel>
                <FieldTextarea value={extra} onChange={setExtra} rows={4}
                  placeholder={
                    activeTool === 'meetingprep' ? 'Specific topics, concerns, or goals for this meeting...'
                    : activeTool === 'followup' ? 'What did you discuss? Reactions? Objections? Next steps?'
                    : 'e.g. equity, exit value, flexibility, cost savings...'
                  }
                />
              </>
            )}

            <Btn variant="ocean" onClick={handleRun} disabled={ai.loading || !selectedGuest} style={{ width: '100%', justifyContent: 'center' }}>
              <i className="ti ti-sparkles" /> Generate
            </Btn>

            {(ai.output || ai.loading) && (
              <div style={{ marginTop: 16 }}>
                <AIOutputBox output={ai.output} loading={ai.loading} onRegenerate={handleRun} />
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

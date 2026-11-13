import React, { useState, useEffect } from 'react'
import { AskGuru } from '../components/AskGuru'
import { Btn, Card, CardHeader, CardBody, FieldLabel, FieldInput, FieldSelect, FieldTextarea } from '../components/UI'
import { AIToolsScreen, ObjectionScreen } from './Tools'
import {
  getProducts, saveProduct, deleteProduct, getLessons, saveLesson, deleteLesson, clearBrainCache,
  PRODUCT_CATEGORIES, SOURCE_TIERS, LESSON_KINDS,
} from '../lib/brain'
import { rankGuests } from '../lib/nextAction'

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0', flexWrap: 'wrap' }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
          border: '1px solid var(--border2)', fontFamily: 'var(--font-body)',
          background: active === id ? 'var(--ocean)' : 'white',
          color: active === id ? 'white' : 'var(--ink3)',
        }}>
          <i className={`ti ${icon}`} /> {label}
        </button>
      ))}
    </div>
  )
}
export { Tabs }

export function CoachScreen({ guests }) {
  const [tab, setTab] = useState('ask')
  const top = rankGuests(guests).slice(0, 10)
  const pipeline = top.length
    ? "TODAY'S PRIORITIES (ranked):\n" + top.map(({ guest, next }) => `- ${guest.name} (${guest.status}): ${next.reason}. Suggested: ${next.action}`).join('\n')
    : ''
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Tabs active={tab} onChange={setTab} tabs={[
        ['ask', 'Ask Guru', 'ti-sparkles'],
        ['messages', 'Messages', 'ti-message-2'],
        ['objections', 'Objections', 'ti-shield'],
        ['brain', 'Brain', 'ti-brain'],
      ]} />
      {tab === 'ask' && (
        <div style={{ padding: 20, maxWidth: 820 }}>
          <AskGuru extraContext={pipeline} />
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 10 }}>
            Guru only quotes products and prices from the Brain tab. For one guest, open their profile and ask there: Guru then sees their stay, notes and history.
          </p>
        </div>
      )}
      {tab === 'messages' && <AIToolsScreen guests={guests} />}
      {tab === 'objections' && <ObjectionScreen />}
      {tab === 'brain' && <BrainScreen />}
    </div>
  )
}

const EMPTY_PRODUCT = { name: '', category: 'Points', summary: '', price_text: '', terms: '', source_tier: 'internal', effective_date: '', verify: true, active: true }

export function BrainScreen() {
  const [products, setProducts] = useState([])
  const [lessons, setLessons] = useState([])
  const [editing, setEditing] = useState(null)
  const [lesson, setLesson] = useState({ kind: 'lesson', content: '' })
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [openCats, setOpenCats] = useState({})
  const [formError, setFormError] = useState(null)

  async function load() {
    try {
      const [p, l] = await Promise.all([getProducts(), getLessons(100)])
      setProducts(p); setLessons(l); setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoaded(true)
    }
  }
  useEffect(() => { load() }, [])

  async function save() {
    try {
      const p = { ...editing, effective_date: editing.effective_date || null }
      await saveProduct(p)
      clearBrainCache(); setEditing(null); setFormError(null)
      setOpenCats(c => ({ ...c, [p.category || 'Other']: true }))
      load()
    } catch (e) { setFormError(e.message) }
  }
  async function remove(p) {
    if (!window.confirm(`Remove ${p.name} from the Brain?`)) return
    try { await deleteProduct(p.id); clearBrainCache(); load() } catch (e) { setError(e.message) }
  }
  async function addLesson() {
    if (!lesson.content.trim()) return
    try { await saveLesson({ kind: lesson.kind, content: lesson.content.trim() }); setLesson({ kind: lesson.kind, content: '' }); clearBrainCache(); load() }
    catch (e) { setError(e.message) }
  }
  async function removeLesson(l) {
    if (!window.confirm('Delete this lesson?')) return
    try { await deleteLesson(l.id); clearBrainCache(); load() } catch (e) { setError(e.message) }
  }

  const grouped = PRODUCT_CATEGORIES.map(c => [c, products.filter(p => (p.category || 'Other') === c)]).filter(([, list]) => list.length)

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16, maxWidth: 900 }}>
      {error && <div style={{ background: 'var(--rose-light)', color: 'var(--rose)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>{error}</div>}

      <Card>
        <CardHeader title="Products & prices" right={<Btn size="sm" onClick={() => { setFormError(null); setEditing({ ...EMPTY_PRODUCT }) }}><i className="ti ti-plus" /> Add</Btn>} />
        <CardBody>
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 0 }}>
            Guru may only quote what's here. Keep prices current, set the date they apply from, and tick "verify" until you've checked a price against the official sheet.
          </p>
          {loaded && products.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink4)' }}>No products yet. Until you add some, Guru won't quote any prices.</div>}
          {grouped.map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 6 }}>
              <button onClick={() => setOpenCats(c => ({ ...c, [cat]: !c[cat] }))} style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sand)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink2)', fontWeight: 500 }}>{cat} <span style={{ color: 'var(--ink4)', fontWeight: 400 }}>· {list.length}</span></span>
                <i className={`ti ti-chevron-${openCats[cat] ? 'up' : 'down'}`} style={{ color: 'var(--ink3)' }} />
              </button>
              {openCats[cat] && list.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--border)', opacity: p.active === false ? .5 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {p.name}
                      {p.verify && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--amber-light)', color: 'var(--amber)', borderRadius: 10, padding: '1px 7px' }}>verify</span>}
                      {p.active === false && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--ink4)' }}>inactive</span>}
                    </div>
                    {p.price_text && <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{p.price_text}</div>}
                    {p.summary && <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{p.summary}</div>}
                    <div style={{ fontSize: 10.5, color: 'var(--ink4)' }}>{p.source_tier}{p.effective_date ? ` · from ${p.effective_date}` : ''}</div>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => { setFormError(null); setEditing({ ...EMPTY_PRODUCT, ...p, effective_date: p.effective_date || '' }) }}><i className="ti ti-pencil" /></Btn>
                  <Btn variant="danger" size="sm" onClick={() => remove(p)}><i className="ti ti-trash" /></Btn>
                </div>
              ))}
            </div>
          ))}
        </CardBody>
      </Card>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,26,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 12px' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560 }}>
        <Card>
          <CardHeader title={editing.id ? `Edit ${editing.name}` : 'Add to the Brain'} right={
            <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', fontSize: 18 }}><i className="ti ti-x" /></button>
          } />
          <CardBody>
            <FieldLabel>Name</FieldLabel>
            <FieldInput value={editing.name} onChange={v => setEditing({ ...editing, name: v })} placeholder="e.g. Points Membership 198 (10-year)" />
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><FieldLabel>Category</FieldLabel><FieldSelect value={editing.category} onChange={v => setEditing({ ...editing, category: v })} options={PRODUCT_CATEGORIES} /></div>
              <div><FieldLabel>Source</FieldLabel><FieldSelect value={editing.source_tier} onChange={v => setEditing({ ...editing, source_tier: v })} options={SOURCE_TIERS} /></div>
            </div>
            <FieldLabel>Price (as you'd say it)</FieldLabel>
            <FieldInput value={editing.price_text} onChange={v => setEditing({ ...editing, price_text: v })} placeholder="e.g. USD 24,900, or 10% deposit then 36 months" />
            <FieldLabel>What it is / who it fits</FieldLabel>
            <FieldTextarea value={editing.summary} onChange={v => setEditing({ ...editing, summary: v })} rows={3} />
            <FieldLabel>Terms (fees, length, booking rules)</FieldLabel>
            <FieldTextarea value={editing.terms} onChange={v => setEditing({ ...editing, terms: v })} rows={2} />
            <FieldLabel>Price applies from</FieldLabel>
            <FieldInput type="date" value={editing.effective_date} onChange={v => setEditing({ ...editing, effective_date: v })} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
              <input type="checkbox" checked={!!editing.verify} onChange={e => setEditing({ ...editing, verify: e.target.checked })} /> Verify before quoting
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginBottom: 12 }}>
              <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Currently on sale
            </label>
            {formError && <div style={{ background: 'var(--rose-light)', color: 'var(--rose)', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 10 }}>Couldn't save: {formError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={save} disabled={!editing.name.trim()}>Save</Btn>
              <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
            {!editing.name.trim() && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>Give it a name to save.</div>}
          </CardBody>
        </Card>
        </div>
        </div>
      )}

      <Card>
        <CardHeader title="Lessons" />
        <CardBody>
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 0 }}>
            What worked, what didn't, objections and how you handled them. Guru reads these before every answer. "This worked" on a Guru answer also saves here.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <FieldSelect value={lesson.kind} onChange={v => setLesson({ ...lesson, kind: v })} options={LESSON_KINDS} style={{ width: 150, marginBottom: 0 }} />
          </div>
          <FieldTextarea value={lesson.content} onChange={v => setLesson({ ...lesson, content: v })} rows={2}
            placeholder="e.g. Couples worried about fees respond better to the 'cost per night' framing than yearly totals." />
          <Btn size="sm" onClick={addLesson} disabled={!lesson.content.trim()}><i className="ti ti-plus" /> Add lesson</Btn>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loaded && lessons.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink4)' }}>No lessons yet.</div>}
            {lessons.map(l => (
              <div key={l.id} style={{ display: 'flex', gap: 10, fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ocean)', minWidth: 70 }}>{l.kind}</span>
                <span style={{ flex: 1, color: 'var(--ink2)', whiteSpace: 'pre-wrap' }}>{l.content}</span>
                <button onClick={() => removeLesson(l)} style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

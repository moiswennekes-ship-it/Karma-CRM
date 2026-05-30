import { hasLeft, isLeavingSoon, isToday } from './lib/dates'
import React, { useState } from 'react'
import { useGuests } from './hooks/useGuests'
import { DashboardScreen } from './screens/Dashboard'
import { ObjectionScreen, CalculatorScreen, ComparisonScreen, AIToolsScreen } from './screens/Tools'
import { AddGuestModal } from './components/AddGuestModal'
import { EditGuestModal } from './components/EditGuestModal'
import { GuestCard } from './components/GuestCard'
import { GuestProfile } from './components/GuestProfile'
import { Btn, SectionHeader, StatusPill, Avatar } from './components/UI'
import { ImportScreen } from './components/ImportScreen'
import { WeekHistoryScreen } from './components/WeekHistoryScreen'

// ── NAVIGATION CONFIG ─────────────────────────────────────────
const NAV = [
  { section: 'Workspace' },
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { id: 'guests',      icon: 'ti-users',             label: 'All Members',    badge: 'count' },
  { id: 'arrivals',    icon: 'ti-plane-arrival',     label: 'Arrivals Today', badge: 'arriving', badgeColor: '#B8914A' },
  { id: 'import',      icon: 'ti-table-import',      label: 'Import Leadsheet' },
  { section: 'AI Tools' },
  { id: 'ai-tools',   icon: 'ti-sparkles',           label: 'AI Generator' },
  { id: 'objections', icon: 'ti-shield',             label: 'Objection Handler' },
  { id: 'calculator', icon: 'ti-calculator',         label: 'Fee Calculator' },
  { id: 'comparison', icon: 'ti-git-compare',        label: 'Fractional Compare' },
  { section: 'Reports' },
  { id: 'weeks',      icon: 'ti-history',              label: 'Week History' },
  { id: 'pipeline',   icon: 'ti-chart-bar',            label: 'Pipeline View' },
]

const SCREEN_META = {
  dashboard:   { title: 'Good morning, Mois', sub: new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · Bali · Check your arrivals and pipeline' },
  guests:      { title: 'All Members',          sub: 'View, filter and manage all member records' },
  arrivals:    { title: "Today's Arrivals",     sub: 'Guests checking in today — contact status and welcome messages' },
  'ai-tools':  { title: 'AI Communication Tools', sub: 'Generate personalized messages, proposals and meeting prep' },
  objections:  { title: 'Objection Handler',    sub: 'AI-crafted responses to any membership objection' },
  calculator:  { title: 'Fee Calculator',       sub: 'Project long-term costs — 5, 10, and 25-year views' },
  comparison:  { title: 'Fractional Comparison', sub: 'Side-by-side 10-year comparison of membership vs fractional' },
  import:     { title: 'Import Leadsheet',   sub: 'Paste your weekly leadsheet and import all guests automatically' },
  weeks:      { title: 'Week History',        sub: 'View past weeks, start a new week, and track your conversion history' },
  pipeline:    { title: 'Pipeline View',        sub: 'All active guests grouped by stage' },
}

// ── ALL MEMBERS SCREEN ────────────────────────────────────────
function GuestsScreen({ guests, onStatusChange, onSaveNotes, onDelete, onEdit }) {
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')

  const filtered = guests.filter(g => {
    if (filter === 'Arriving Soon') return g.status === 'Arriving Soon'
    if (filter === 'Hot Lead') return ['Hot Lead', 'Proposal Sent'].includes(g.status)
    if (filter === 'Converted') return g.status === 'Converted'
    return true
  })
  const selected = guests.find(g => g.id === selectedId)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <SectionHeader title={`All Members (${filtered.length})`} right={
          <div style={{ display: 'flex', gap: 5 }}>
            {['all', 'Arriving Soon', 'Hot Lead', 'Converted'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer',
                border: '1px solid var(--border2)', fontFamily: 'var(--font-body)',
                background: filter === f ? 'var(--ocean)' : 'white',
                color: filter === f ? 'white' : 'var(--ink3)', transition: 'all .15s',
              }}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        } />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {filtered.map(g => <GuestCard key={g.id} guest={g} selected={selectedId === g.id} onClick={setSelectedId} />)}
        </div>
      </div>
      <div style={{ width: 330, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>
          Guest Profile
        </div>
        <GuestProfile guest={selected} onStatusChange={onStatusChange} onSaveNotes={onSaveNotes} onDelete={onDelete} onEdit={onEdit} />
      </div>
    </div>
  )
}

// ── ARRIVALS SCREEN ───────────────────────────────────────────
function ArrivalsScreen({ guests, onStatusChange }) {
  const today = guests.filter(g => isToday(g.arrival_date) && !(g.linked_stay || '').toLowerCase().includes('2nd'))
  const [selectedId, setSelectedId] = useState(null)
  const selected = guests.find(g => g.id === selectedId)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <SectionHeader title={`Today's Arrivals (${today.length})`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {today.map(g => {

            return (
              <div key={g.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={g.initials} colorIndex={g.color_index} size={38} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{g.membership} · {g.party} · {g.arrival_date}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill status={g.status} />
                    <Btn variant="ghost" size="sm" onClick={() => setSelectedId(g.id === selectedId ? null : g.id)}>
                      <i className="ti ti-eye" /> Profile
                    </Btn>
                  </div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{g.notes}</div>
                </div>
              </div>
            )
          })}
          {today.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink4)', fontSize: 13 }}>
              No arrivals recorded for today.
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div style={{ width: 330, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>
            Guest Profile
          </div>
          <GuestProfile guest={selected} onStatusChange={onStatusChange} onSaveNotes={() => {}} />
        </div>
      )}
    </div>
  )
}

// ── PIPELINE VIEW ─────────────────────────────────────────────
function PipelineScreen({ guests, onNav }) {
  const stages = ['Arriving Soon', 'Contacted', 'Responded', 'Meeting Booked', 'Follow-Up', 'Hot Lead', 'Proposal Sent', 'Converted']
  const STATUS_CFG = {
    'Arriving Soon':  { bg: '#EBF6F8', color: '#1A5F6E' },
    'Contacted':      { bg: '#F3F2EE', color: '#6E6E73' },
    'Responded':      { bg: '#FBF5EB', color: '#B8762A' },
    'Meeting Booked': { bg: '#FBF5EB', color: '#B8762A' },
    'Follow-Up':      { bg: '#FBF0EF', color: '#C0504A' },
    'Hot Lead':       { bg: '#FBF0EF', color: '#C0504A' },
    'Proposal Sent':  { bg: '#EAF2ED', color: '#2D5A3D' },
    'Converted':      { bg: '#EAF2ED', color: '#2D5A3D' },
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title="Pipeline by Stage" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map(stage => {
          const list = guests.filter(g => g.status === stage)
          if (!list.length) return null
          const sc = STATUS_CFG[stage] || STATUS_CFG['Contacted']
          return (
            <div key={stage} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: sc.color }}>{stage}</div>
                <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                  {list.length} guest{list.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 4px', borderRadius: 8, transition: 'background .15s' }}
                    onClick={() => onNav('dashboard')}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar initials={g.initials} colorIndex={g.color_index} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{g.membership} · {g.arrival_date}</div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )
        }).filter(Boolean)}
      </div>
    </div>
  )
}

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const { guests, loading, error, addGuest, editGuest, updateStatus, saveNotes, removeGuest, pipelineCounts, todayArrivals } = useGuests()
  const [screen, setScreen] = useState('dashboard')
  const [addOpen, setAddOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(22)
  const [editingGuest, setEditingGuest] = useState(null)

  const meta = SCREEN_META[screen] || SCREEN_META.dashboard

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--sand)', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="dot-pulse" style={{ justifyContent: 'center', marginBottom: 16 }}><span /><span /><span /></div>
          <p style={{ fontSize: 13, color: 'var(--ink3)' }}>Loading your member data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--sand)', fontFamily: 'var(--font-body)', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 440, textAlign: 'center', boxShadow: 'var(--shadow2)' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 40, color: 'var(--rose)', marginBottom: 16, display: 'block' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Connection error</h2>
          <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6 }}>
            Could not connect to Supabase. Check that your <code>.env</code> file has the correct <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> values, then restart the dev server.
          </p>
          <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 12 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--sand)' }}>

      {/* SIDEBAR */}
      <div style={{ width: 230, background: 'var(--ink)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#D4A855' }}>Karma CRM</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 2 }}>Member Relations</div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', letterSpacing: '2.5px', textTransform: 'uppercase', padding: '14px 10px 6px' }}>
                {item.section}
              </div>
            )
            const active = screen === item.id
            const badgeVal = item.badge === 'count' ? guests.length : item.badge === 'arriving' ? todayArrivals.length : null
            return (
              <div key={item.id} onClick={() => setScreen(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 1,
                background: active ? 'rgba(184,145,74,.14)' : 'transparent',
                color: active ? '#D4A855' : 'rgba(255,255,255,.46)',
                fontSize: 12.5, transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.46)' }}}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18, textAlign: 'center' }} />
                {item.label}
                {badgeVal != null && (
                  <span style={{ marginLeft: 'auto', background: item.badgeColor || '#C0504A', color: 'white', borderRadius: 10, fontSize: 10, padding: '1px 7px', fontWeight: 500 }}>
                    {badgeVal}
                  </span>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'white' }}>JR</div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>Mois Wennekes</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>Member Relations · Bali</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>{meta.title}</h2>
            <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>{meta.sub}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setScreen('ai-tools')}>
              <i className="ti ti-sparkles" /> AI Generate
            </Btn>
            <Btn variant="ocean" size="sm" onClick={() => setAddOpen(true)}>
              <i className="ti ti-user-plus" /> Add Guest
            </Btn>
          </div>
        </div>

        {/* SCREENS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {screen === 'dashboard'  && <DashboardScreen  guests={guests} pipelineCounts={pipelineCounts} todayArrivals={todayArrivals.length} onStatusChange={updateStatus} onSaveNotes={saveNotes} onDelete={removeGuest} onEdit={setEditingGuest} onNav={setScreen} />}
          {screen === 'guests'     && <GuestsScreen     guests={guests} onStatusChange={updateStatus} onSaveNotes={saveNotes} onDelete={removeGuest} onEdit={setEditingGuest} />}
          {screen === 'arrivals'   && <ArrivalsScreen   guests={guests} onStatusChange={updateStatus} />}
          {screen === 'ai-tools'   && <AIToolsScreen    guests={guests} />}
          {screen === 'objections' && <ObjectionScreen />}
          {screen === 'calculator' && <CalculatorScreen />}
          {screen === 'comparison' && <ComparisonScreen />}
          {screen === 'pipeline'   && <PipelineScreen   guests={guests} onNav={setScreen} />}
          {screen === 'import'    && <ImportScreen onImport={(g) => addGuest({ ...g, week_number: currentWeek, week_label: `Week ${currentWeek}` })} />}
          {screen === 'weeks'     && <WeekHistoryScreen currentWeek={currentWeek} onStartNewWeek={(wk) => { setCurrentWeek(wk); setScreen('dashboard') }} />}
        </div>
      </div>

      {/* ADD GUEST MODAL */}
      <AddGuestModal open={addOpen} onClose={() => setAddOpen(false)} onSave={addGuest} />

      {/* EDIT GUEST MODAL */}
      <EditGuestModal
        guest={editingGuest}
        open={!!editingGuest}
        onClose={() => setEditingGuest(null)}
        onSave={async (id, updates) => { await editGuest(id, updates); setEditingGuest(null) }}
      />
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { useGuests } from './hooks/useGuests'
import { useAuth } from './hooks/useAuth'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase } from './lib/supabase'
import { karmaWeek, karmaWeekRange, karmaYear, parseKarmaDate } from './lib/dates'
import { withHistory } from './lib/history'
import { DashboardScreen } from './screens/Dashboard'
import { GuestsScreen } from './screens/Guests'
import { CalendarScreen } from './screens/Calendar'
import { CoachScreen, Tabs } from './screens/Coach'
import { CalculatorScreen, ComparisonScreen } from './screens/Tools'
import { PointsPassportScreen } from './screens/PointsPassport'
import { AddGuestModal } from './components/AddGuestModal'
import { EditGuestModal } from './components/EditGuestModal'
import { Btn } from './components/UI'
import { ImportScreen } from './components/ImportScreen'
import { WeekHistoryScreen } from './components/WeekHistoryScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginScreen } from './screens/Login'
import { ManagerScreen } from './screens/Manager'
import { useTeamActivity, untouchedLeads } from './lib/manager'

// ── NAVIGATION: six screens, one job each ─────────────────────
const NAV = [
  { id: 'today',  icon: 'ti-sun',            label: 'Today' },
  { id: 'guests', icon: 'ti-users',          label: 'Guests' },
  { id: 'calendar', icon: 'ti-calendar',     label: 'Calendar' },
  { id: 'coach',  icon: 'ti-sparkles',       label: 'Ask Guru' },
  { id: 'import', icon: 'ti-table-import',   label: 'Import' },
  { id: 'tools',  icon: 'ti-calculator',     label: 'Tools' },
]

// Managers don't work leads: they get their own three screens.
const MANAGER_NAV = [
  { id: 'team',    icon: 'ti-chart-bar', label: 'Team' },
  { id: 'teamcal', icon: 'ti-calendar',  label: 'Calendar' },
  { id: 'teamact', icon: 'ti-activity',  label: 'Activity' },
]
const MANAGER_TAB = { team: 'overview', teamcal: 'calendar', teamact: 'activity' }

const SCREEN_META = {
  today:  { title: 'Today', sub: 'Who to work next, and why' },
  guests: { title: 'Guests', sub: 'Search everyone, open a guest file' },
  calendar: { title: 'Calendar', sub: 'Check-ins, check-outs and tours' },
  coach:  { title: 'Ask Guru', sub: 'Your AI sales coach, messages, objections and the Karma Brain' },
  import: { title: 'Import & weeks', sub: 'Paste the weekly leadsheet, manage weeks' },
  tools:  { title: 'Tools', sub: 'Points Passport, fee projections, fractional comparison' },
  team:    { title: 'Team', sub: 'What every rep is up to' },
  teamcal: { title: 'Team calendar', sub: "Every rep's guests and tours" },
  teamact: { title: 'Activity', sub: 'Everything the reps have logged' },
}

function ImportHub({ currentWeek, currentYear, guests, onImport, onUpdate, onStartNewWeek, onOpenGuest }) {
  const [tab, setTab] = useState('import')
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Tabs active={tab} onChange={setTab} tabs={[['import', 'Import leadsheet', 'ti-table-import'], ['weeks', 'Weeks', 'ti-history']]} />
      {tab === 'import' && <ImportScreen onImport={onImport} onUpdate={onUpdate} guests={guests} />}
      {tab === 'weeks' && <WeekHistoryScreen currentWeek={currentWeek} currentYear={currentYear} onStartNewWeek={onStartNewWeek} onOpenGuest={onOpenGuest} />}
    </div>
  )
}

function ToolsHub({ guests, addGuest, onGoToGuest }) {
  const [tab, setTab] = useState('passport')
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Tabs active={tab} onChange={setTab} tabs={[
        ['passport', 'Points Passport', 'ti-passport'],
        ['fees', 'Fee projection', 'ti-calculator'],
        ['fractional', 'Fractional compare', 'ti-git-compare'],
      ]} />
      {tab === 'passport' && <PointsPassportScreen guests={guests} addGuest={addGuest} onGoToGuest={onGoToGuest} />}
      {tab === 'fees' && <CalculatorScreen />}
      {tab === 'fractional' && <ComparisonScreen />}
    </div>
  )
}

function CenterCard({ icon, title, children, iconColor = 'var(--ocean)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--sand)', fontFamily: 'var(--font-body)', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 440, textAlign: 'center', boxShadow: 'var(--shadow2)' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 38, color: iconColor, marginBottom: 14, display: 'block' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const { session, staff, isManager, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth()
  const { guests: rawGuests, loading, error, addGuest, editGuest, updateStatus, removeGuest, reload } = useGuests(staff?.id, staff?.name)
  // Each guest carries their earlier stays (matched on member number).
  const guests = useMemo(() => withHistory(rawGuests), [rawGuests])
  const { interactions: teamActivity, teamGuests } = useTeamActivity(isManager)
  const untouchedCount = useMemo(() => isManager ? untouchedLeads(teamGuests, teamActivity).length : 0, [isManager, teamGuests, teamActivity])
  const isMobile = useIsMobile()
  const [screen, setScreen] = useState('today')
  const [addOpen, setAddOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(karmaWeek())
  const [currentYear, setCurrentYear] = useState(karmaYear())
  const [focusGuestId, setFocusGuestId] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  useEffect(() => {
    if (isManager && !MANAGER_TAB[screen]) setScreen('team')
    if (!isManager && MANAGER_TAB[screen]) setScreen('today')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager])
  const [editingGuest, setEditingGuest] = useState(null)

  // Karma weeks run Saturday to Friday and the number comes from the date,
  // so it flips by itself at midnight on Saturday (Bali time).
  useEffect(() => {
    const t = setInterval(() => { setCurrentWeek(karmaWeek()); setCurrentYear(karmaYear()) }, 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Keep the weeks table in step: archive earlier weeks with their totals
  // and make sure this week has a row.
  useEffect(() => {
    if (!session) return
    ;(async () => {
      const { data: weeks } = await supabase.from('weeks').select('*')
      const isCurrent = w => w.week_number === currentWeek && (w.week_year || currentYear) === currentYear
      for (const w of (weeks || []).filter(w => w.status === 'active' && !isCurrent(w))) {
        let gq = supabase.from('guests').select('status').eq('week_number', w.week_number)
        gq = w.week_year ? gq.eq('week_year', w.week_year) : gq.is('week_year', null)
        const { data: wg } = await gq
        await supabase.from('weeks').update({
          status: 'archived',
          guest_count: (wg || []).length,
          toured_count: (wg || []).filter(g => ['Toured', 'Follow-Up', 'Hot Lead', 'Converted'].includes(g.status)).length,
          converted_count: (wg || []).filter(g => g.status === 'Converted').length,
        }).eq('id', w.id)
      }
      const cur = (weeks || []).find(isCurrent)
      if (!cur) {
        const { start, end } = karmaWeekRange()
        await supabase.from('weeks').insert([{ week_number: currentWeek, week_year: currentYear, week_label: `Week ${currentWeek}`, start_date: start, end_date: end, status: 'active' }])
      } else if (cur.status !== 'active' || !cur.week_year) {
        await supabase.from('weeks').update({ status: 'active', week_year: currentYear }).eq('id', cur.id)
      }
    })().catch(() => {})
  }, [session, currentWeek, currentYear])

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--sand)' }}>
        <div className="dot-pulse"><span /><span /><span /></div>
      </div>
    )
  }
  if (!session) return <LoginScreen onSignIn={signIn} onSignUp={signUp} />
  if (!staff) {
    return (
      <CenterCard icon="ti-user-plus" title="Finishing setup...">
        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 16 }}>
          {authError || "We're linking your account to a staff profile. If this doesn't clear in a few seconds, reload."}
        </p>
        <Btn onClick={() => window.location.reload()}>Reload</Btn>
      </CenterCard>
    )
  }
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--sand)', flexDirection: 'column', gap: 14 }}>
        <div className="dot-pulse"><span /><span /><span /></div>
        <p style={{ fontSize: 13, color: 'var(--ink3)', fontFamily: 'var(--font-body)' }}>Loading your guests...</p>
      </div>
    )
  }
  if (error) {
    return (
      <CenterCard icon="ti-cloud-off" title="Can't reach the database" iconColor="var(--rose)">
        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 16 }}>
          The database may be waking up after a quiet week. Wait a minute and try again.
        </p>
        <Btn onClick={() => window.location.reload()}>Try again</Btn>
        <p style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 12 }}>Details: {error}</p>
      </CenterCard>
    )
  }

  const nav = isManager ? MANAGER_NAV : NAV
  const meta = SCREEN_META[screen] || SCREEN_META.today
  const firstName = staff?.name ? staff.name.split(' ')[0] : ''
  const title = screen === 'today' && firstName
    ? `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`
    : meta.title
  const weekLabel = currentWeek ? `Week ${currentWeek}` : ''
  const profileProps = {
    staffName: staff?.name,
    onStatusChange: updateStatus,
    onEditGuest: editGuest,
    onDelete: removeGuest,
    onEdit: setEditingGuest,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', background: 'var(--sand)' }}>
      {/* SIDEBAR (desktop) */}
      {!isMobile && (
        <div style={{ width: 210, background: 'var(--ink)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#D4A855' }}>Karma CRM</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 2 }}>Sales Guru</div>
          </div>
          <nav style={{ flex: 1, padding: '14px 10px' }}>
            {nav.map(item => {
              const active = screen === item.id
              return (
                <div key={item.id} onClick={() => setScreen(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: active ? 'rgba(184,145,74,.14)' : 'transparent',
                  color: active ? '#D4A855' : 'rgba(255,255,255,.55)', fontSize: 13,
                }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 17, width: 18, textAlign: 'center' }} />
                  {item.label}
                  {item.id === 'team' && untouchedCount > 0 && <span style={{ marginLeft: 'auto', background: 'var(--rose)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{untouchedCount}</span>}
                </div>
              )
            })}
          </nav>
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'white', flexShrink: 0 }}>
              {staff.avatar_initials || staff.name?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)' }}>{weekLabel}{isManager ? ' · Manager' : ''}</div>
            </div>
            <i className="ti ti-logout" title="Sign out" onClick={signOut} style={{ fontSize: 15, color: 'rgba(255,255,255,.4)', cursor: 'pointer' }} />
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: isMobile ? '10px 14px' : '14px 22px', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 20, fontWeight: 500, margin: 0 }}>{title}</h2>
            {!isMobile && <p style={{ fontSize: 11, color: 'var(--ink3)', margin: '1px 0 0' }}>{meta.sub}{weekLabel ? ` · ${weekLabel}` : ''}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isManager && (
              <Btn variant="ocean" size="sm" onClick={() => setAddOpen(true)}>
                <i className="ti ti-user-plus" />{!isMobile && ' Add guest'}
              </Btn>
            )}
            {isMobile && <i className="ti ti-logout" onClick={signOut} style={{ fontSize: 18, color: 'var(--ink3)', cursor: 'pointer' }} />}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0, paddingBottom: isMobile && !['today', 'guests', 'calendar'].includes(screen) ? 80 : 0 }}>
          <ErrorBoundary key={screen} label={meta.title}>
            {!isManager && screen === 'today'  && <DashboardScreen guests={guests} isMobile={isMobile} onGoTo={setScreen} {...profileProps} />}
            {!isManager && screen === 'guests' && <GuestsScreen guests={guests} isMobile={isMobile} focusId={focusGuestId} onFocusUsed={() => setFocusGuestId(null)} {...profileProps} />}
            {!isManager && screen === 'calendar' && <CalendarScreen guests={guests} isMobile={isMobile} onEditGuest={editGuest} staffName={staff?.name} onOpenGuest={(id) => { setFocusGuestId(id); setScreen('guests') }} />}
            {!isManager && screen === 'coach'  && <CoachScreen guests={guests} />}
            {!isManager && screen === 'import' && (
              <ImportHub
                currentWeek={currentWeek}
                currentYear={currentYear}
                guests={guests}
                onUpdate={editGuest}
                onOpenGuest={(id) => { setFocusGuestId(id); setScreen('guests') }}
                onImport={(g) => {
                  // File each guest under the Karma week they arrive in, so next
                  // week's leads imported early land in next week.
                  const arrives = parseKarmaDate(g.arrival_date) || new Date()
                  const wk = karmaWeek(arrives)
                  return addGuest({ ...g, week_number: wk, week_year: karmaYear(arrives), week_label: `Week ${wk}` })
                }}
                onStartNewWeek={() => { reload(); setScreen('today') }}
              />
            )}
            {!isManager && screen === 'tools'  && <ToolsHub guests={guests} addGuest={addGuest} onGoToGuest={() => setScreen('guests')} />}
            {isManager && MANAGER_TAB[screen] && <ManagerScreen guests={teamGuests} interactions={teamActivity} isMobile={isMobile} currentStaffId={staff.id} tab={MANAGER_TAB[screen]} onTab={t => setScreen(Object.keys(MANAGER_TAB).find(k => MANAGER_TAB[k] === t))} />}
          </ErrorBoundary>
        </div>
      </div>

      {/* BOTTOM NAV (phone) */}
      {isMobile && (() => {
        // Four main screens on the bar; the rest live under More
        const main = isManager ? nav.map(i => i.id) : ['today', 'guests', 'calendar', 'coach']
        const bar = nav.filter(i => main.includes(i.id))
        const more = nav.filter(i => !main.includes(i.id))
        const moreActive = more.some(i => i.id === screen)
        const Item = ({ icon, label, active, onClick }) => (
          <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? '#D4A855' : 'rgba(255,255,255,.6)', fontSize: 11.5, cursor: 'pointer', flex: 1 }}>
            <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
            {label}
          </div>
        )
        return (
          <>
            {moreOpen && (
              <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,26,.4)', zIndex: 99 }}>
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 10, right: 10, bottom: 'calc(76px + env(safe-area-inset-bottom))', background: 'white', borderRadius: 16, padding: 8, boxShadow: 'var(--shadow2)' }}>
                  {more.map(item => (
                    <div key={item.id} onClick={() => { setScreen(item.id); setMoreOpen(false) }} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 15,
                      background: screen === item.id ? 'var(--ocean-light)' : 'transparent', color: screen === item.id ? 'var(--ocean)' : 'var(--ink)',
                    }}>
                      <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} /> {item.label}
                      {item.id === 'team' && untouchedCount > 0 && <span style={{ marginLeft: 'auto', background: 'var(--rose)', color: 'white', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{untouchedCount}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'var(--ink)', display: 'flex', padding: '9px 4px calc(9px + env(safe-area-inset-bottom))', zIndex: 100 }}>
              {bar.map(item => (
                <div key={item.id} style={{ flex: 1, position: 'relative', display: 'flex' }}>
                  <Item icon={item.icon} label={item.id === 'coach' ? 'Guru' : item.label} active={screen === item.id && !moreOpen} onClick={() => { setScreen(item.id); setMoreOpen(false) }} />
                  {item.id === 'team' && untouchedCount > 0 && <span style={{ position: 'absolute', top: -2, right: '22%', background: 'var(--rose)', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: 10.5, fontWeight: 700 }}>{untouchedCount}</span>}
                </div>
              ))}
              {more.length > 0 && <Item icon="ti-dots" label="More" active={moreActive || moreOpen} onClick={() => setMoreOpen(o => !o)} />}
            </div>
          </>
        )
      })()}

      <AddGuestModal open={addOpen} onClose={() => setAddOpen(false)} onSave={addGuest} />
      <EditGuestModal
        guest={editingGuest}
        open={!!editingGuest}
        onClose={() => setEditingGuest(null)}
        onSave={async (id, updates) => { await editGuest(id, updates); setEditingGuest(null) }}
      />
    </div>
  )
}

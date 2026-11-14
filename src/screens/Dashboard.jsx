import React, { useState } from 'react'
import { Avatar, StatusPill } from '../components/UI'
import { ProfilePanel } from '../components/ProfilePanel'
import { MorningBriefing } from '../components/MorningBriefing'
import { rankGuests, isArrivingToday, isInHouseNow } from '../lib/nextAction'
import { isLeavingSoon, hasLeft, tourDayKey, tourTime, baliTodayKey } from '../lib/dates'

const FILTERS = [
  { key: 'priorities', label: 'Priorities' },
  { key: 'arriving', label: 'Arriving today' },
  { key: 'inhouse', label: 'In house' },
  { key: 'leaving', label: 'Leaving soon' },
  { key: 'tours', label: 'Tours booked' },
  { key: 'hot', label: 'Hot leads' },
]

// TODAY: today's tours up top, then one ranked list of who to work and why.
export function DashboardScreen({ guests, isMobile, onGoTo, ...profileProps }) {
  const [filter, setFilter] = useState('priorities')
  const [selectedId, setSelectedId] = useState(null)

  const ranked = rankGuests(guests)
  const list = ranked.filter(({ guest: g }) => {
    if (filter === 'arriving') return isArrivingToday(g)
    if (filter === 'inhouse') return isInHouseNow(g)
    if (filter === 'leaving') return isLeavingSoon(g.depart_date, 2) && !hasLeft(g.depart_date)
    if (filter === 'hot') return g.status === 'Hot Lead'
    if (filter === 'tours') return g.status === 'Tour Booked'
    return true
  })
  const selected = guests.find(g => g.id === selectedId)

  const today = baliTodayKey()
  const toursToday = guests
    .filter(g => g.tour_at && tourDayKey(g.tour_at) === today)
    .sort((a, b) => a.tour_at.localeCompare(b.tour_at))

  // Only the counts that aren't zero
  const counts = [
    ['Arriving today', guests.filter(isArrivingToday).length, 'arriving'],
    ['In house', guests.filter(isInHouseNow).length, 'inhouse'],
    ['Leaving soon', guests.filter(g => isLeavingSoon(g.depart_date, 2) && !hasLeft(g.depart_date)).length, 'leaving'],
    ['Hot leads', guests.filter(g => g.status === 'Hot Lead' && !hasLeft(g.depart_date)).length, 'hot'],
  ].filter(([, n]) => n > 0)

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 90px' : '18px 22px', minWidth: 0 }}>
        <MorningBriefing guests={guests} />

        {/* Today's tours */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', margin: '14px 0', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: toursToday.length ? 10 : 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              <i className="ti ti-calendar-event" style={{ color: '#9A6A1F' }} /> {toursToday.length ? `${toursToday.length} tour${toursToday.length > 1 ? 's' : ''} today` : 'No tours today'}
            </div>
            {onGoTo && (
              <button onClick={() => onGoTo('calendar')} style={{ background: 'none', border: 'none', color: 'var(--ocean)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {toursToday.length ? 'Calendar' : 'Plan tours'} <i className="ti ti-chevron-right" />
              </button>
            )}
          </div>
          {toursToday.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {toursToday.map(g => (
                <div key={g.id} onClick={() => setSelectedId(g.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, background: '#FBF3E4', cursor: 'pointer' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#9A6A1F', minWidth: 52 }}>{tourTime(g.tour_at)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{g.membership || g.member_type}{g.room ? ` · Rm ${g.room}` : ''}</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: 'var(--ink4)' }} />
                </div>
              ))}
            </div>
          )}
          {counts.length > 0 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              {counts.map(([label, n, key]) => (
                <button key={label} onClick={() => setFilter(key)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink2)' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: key === 'leaving' ? 'var(--rose)' : 'var(--ocean)' }}>{n}</strong> {label.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${filter === f.key ? 'var(--ocean)' : 'var(--border2)'}`, fontFamily: 'var(--font-body)',
              background: filter === f.key ? 'var(--ocean)' : 'white',
              color: filter === f.key ? 'white' : 'var(--ink2)',
            }}>{f.label}</button>
          ))}
        </div>

        {/* Who to work */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(({ guest: g, next }, i) => {
            const top = filter === 'priorities' && i < 3
            const sel = selectedId === g.id
            return (
              <React.Fragment key={g.id}>
                {filter === 'priorities' && i === 0 && <SectionLabel>Up next</SectionLabel>}
                {filter === 'priorities' && i === 3 && <SectionLabel>Then</SectionLabel>}
                <div onClick={() => setSelectedId(g.id)} style={{
                  background: sel ? 'var(--ocean-light)' : 'white',
                  border: `1px solid ${sel ? 'var(--ocean2)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${next.urgent ? 'var(--rose)' : top ? 'var(--gold)' : 'transparent'}`,
                  borderRadius: 14, padding: top ? '14px 16px' : '11px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
                  boxShadow: top ? 'var(--shadow2)' : 'var(--shadow)',
                }}>
                  <Avatar initials={g.initials} colorIndex={g.color_index} size={top ? 42 : 34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: top ? 15 : 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: top ? 14 : 13, fontWeight: 500, color: next.urgent ? 'var(--rose)' : 'var(--ocean)', marginTop: 1 }}>{next.action}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'nowrap' : 'normal' }}>{next.reason}</div>
                  </div>
                  {top && g.whatsapp && (
                    <a href={`https://wa.me/${g.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Open WhatsApp"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: '#25D366', color: 'white', fontSize: 18, textDecoration: 'none', flexShrink: 0 }}>
                      <i className="ti ti-brand-whatsapp" />
                    </a>
                  )}
                  {!isMobile && !top && <StatusPill status={g.status} />}
                </div>
              </React.Fragment>
            )
          })}
          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)', fontSize: 13.5 }}>
              {guests.length === 0 ? 'No guests yet. Import your leadsheet to get started.' : 'Nobody here right now.'}
            </div>
          )}
        </div>
      </div>
      <ProfilePanel guest={selected} isMobile={isMobile} onClose={() => setSelectedId(null)} {...profileProps} />
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', margin: '6px 2px 2px' }}>{children}</div>
}

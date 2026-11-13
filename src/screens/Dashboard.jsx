import React, { useState } from 'react'
import { Avatar, StatusPill } from '../components/UI'
import { ProfilePanel } from '../components/ProfilePanel'
import { MorningBriefing } from '../components/MorningBriefing'
import { rankGuests } from '../lib/nextAction'
import { isToday, isInHouse, isLeavingSoon, hasLeft } from '../lib/dates'

const FILTERS = [
  { key: 'priorities', label: 'Priorities' },
  { key: 'arriving', label: 'Arriving today' },
  { key: 'inhouse', label: 'In house' },
  { key: 'leaving', label: 'Leaving soon' },
  { key: 'hot', label: 'Hot leads' },
  { key: 'meetings', label: 'Meetings' },
]

// TODAY: one ranked list of who to work and why.
export function DashboardScreen({ guests, isMobile, ...profileProps }) {
  const [filter, setFilter] = useState('priorities')
  const [selectedId, setSelectedId] = useState(null)

  const ranked = rankGuests(guests)
  const list = ranked.filter(({ guest: g }) => {
    if (filter === 'arriving') return isToday(g.arrival_date)
    if (filter === 'inhouse') return isInHouse(g.arrival_date, g.depart_date)
    if (filter === 'leaving') return isLeavingSoon(g.depart_date, 2) && !hasLeft(g.depart_date)
    if (filter === 'hot') return g.status === 'Hot Lead'
    if (filter === 'meetings') return g.status === 'Meeting Booked'
    return true
  })
  const selected = guests.find(g => g.id === selectedId)

  const stats = [
    ['Arriving today', guests.filter(g => isToday(g.arrival_date)).length],
    ['In house', guests.filter(g => isInHouse(g.arrival_date, g.depart_date)).length],
    ['Hot leads', guests.filter(g => g.status === 'Hot Lead' && !hasLeft(g.depart_date)).length],
    ['Meetings', guests.filter(g => g.status === 'Meeting Booked' && !hasLeft(g.depart_date)).length],
    ['Converted', guests.filter(g => g.status === 'Converted').length],
  ]

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 12px 90px' : '16px 20px', minWidth: 0 }}>
        <MorningBriefing guests={guests} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, margin: '14px 0' }}>
          {stats.slice(0, isMobile ? 3 : 5).map(([label, value]) => (
            <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1px solid var(--border2)', fontFamily: 'var(--font-body)',
              background: filter === f.key ? 'var(--ocean)' : 'white',
              color: filter === f.key ? 'white' : 'var(--ink3)',
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(({ guest: g, next }, i) => (
            <div key={g.id} onClick={() => setSelectedId(g.id)} style={{
              background: selectedId === g.id ? 'var(--ocean-light)' : 'white',
              border: `1px solid ${selectedId === g.id ? 'var(--ocean2)' : next.urgent ? 'rgba(192,80,74,.45)' : 'var(--border)'}`,
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
              boxShadow: 'var(--shadow)',
            }}>
              {filter === 'priorities' && (
                <div style={{ width: 20, textAlign: 'center', fontSize: 12, color: 'var(--ink4)', flexShrink: 0 }}>{i + 1}</div>
              )}
              <Avatar initials={g.initials} colorIndex={g.color_index} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: 12, color: next.urgent ? 'var(--rose)' : 'var(--ink2)' }}>{next.action}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{next.reason}</div>
              </div>
              {!isMobile && <StatusPill status={g.status} />}
            </div>
          ))}
          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)', fontSize: 13 }}>
              {guests.length === 0 ? 'No guests yet. Import your leadsheet to get started.' : 'Nobody here right now.'}
            </div>
          )}
        </div>
      </div>
      <ProfilePanel guest={selected} isMobile={isMobile} onClose={() => setSelectedId(null)} {...profileProps} />
    </div>
  )
}

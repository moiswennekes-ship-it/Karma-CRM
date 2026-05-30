import React, { useState } from 'react'
import { GuestCard } from '../components/GuestCard'
import { GuestProfile } from '../components/GuestProfile'
import { StatCard, SectionHeader, Btn } from '../components/UI'
import { MorningBriefing } from '../components/MorningBriefing'
import { ClosingWindowAlerts } from '../components/ClosingWindowAlerts'
import { hasLeft, isLeavingSoon, isToday } from '../lib/dates'

const PIPELINE_STAGES = [
  { label: 'Arriving Soon', icon: 'ti-plane-arrival', color: '#1A5F6E', bg: '#EBF6F8', key: 'arriving' },
  { label: 'Contacted',     icon: 'ti-message',       color: '#6E6E73', bg: '#F3F2EE', key: 'contacted' },
  { label: 'Meeting Booked',icon: 'ti-calendar',      color: '#B8762A', bg: '#FBF5EB', key: 'meetingBooked' },
  { label: 'Hot Lead',      icon: 'ti-flame',         color: '#C0504A', bg: '#FBF0EF', key: 'hotLead' },
  { label: 'Converted',     icon: 'ti-check',         color: '#2D5A3D', bg: '#EAF2ED', key: 'converted' },
]

const FILTERS = [
  { label: 'All',           key: 'all' },
  { label: 'Hot Leads',     key: 'hot' },
  { label: 'Follow-Up',     key: 'followup' },
  { label: 'Arriving',      key: 'arriving' },
  { label: 'Leaving Soon',  key: 'leaving' },
]

export function DashboardScreen({ guests, pipelineCounts, todayArrivals, onStatusChange, onSaveNotes, onDelete, onEdit, onNav }) {
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = guests.filter(g => {
    if (filter === 'hot') return g.upgrade_score >= 65 && !hasLeft(g.depart_date)
    if (filter === 'followup') return ['Follow-Up', 'Meeting Booked', 'Contacted'].includes(g.status) && !hasLeft(g.depart_date)
    if (filter === 'arriving') return isToday(g.arrival_date)
    if (filter === 'leaving') return isLeavingSoon(g.depart_date, 2) && !hasLeft(g.depart_date)
    return true // 'all' shows everyone including departed
  })

  const selected = guests.find(g => g.id === selectedId)

  return (
    <>
      {/* Morning Briefing */}
      <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
        <MorningBriefing guests={guests} />
      </div>

      {/* Closing Window Alerts */}
      <div style={{ flexShrink: 0 }}>
        <ClosingWindowAlerts guests={guests} onSelectGuest={setSelectedId} />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <StatCard label="Arriving Today" value={todayArrivals} hint="↑ check in queue" hintColor="var(--ocean)" onClick={() => onNav('arrivals')} />
        <StatCard label="Active Pipeline" value={guests.filter(g => g.status !== 'Departed').length} hint={`${pipelineCounts.followUp} follow-ups due`} hintColor="var(--amber)" />
        <StatCard label="Meeting Booked" value={pipelineCounts.meetingBooked} hint="booked this week" hintColor="var(--palm)" />
        <StatCard label="Hot Leads" value={pipelineCounts.hotLead} hint="high priority" hintColor="var(--rose)" />
        <StatCard label="Converted" value={pipelineCounts.converted} hint="this week" hintColor="var(--palm)" />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left col */}
        <div style={{ flex: 1, padding: '18px 20px', minWidth: 0 }}>
          <SectionHeader
            title="Live Member Pipeline"
            right={
              <div style={{ display: 'flex', gap: 5 }}>
                {FILTERS.map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11.5, cursor: 'pointer',
                    border: '1px solid var(--border2)', fontFamily: 'var(--font-body)',
                    background: filter === f.key ? 'var(--ocean)' : 'white',
                    color: filter === f.key ? 'white' : 'var(--ink3)',
                    transition: 'all .15s',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            }
          />

          {/* Pipeline stages */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {PIPELINE_STAGES.map(s => (
              <div key={s.key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: `1px solid ${s.color}30`, background: s.bg, color: s.color, cursor: 'pointer',
              }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 12 }} />
                {s.label}
                <span style={{ background: s.color, color: 'white', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>
                  {pipelineCounts[s.key]}
                </span>
              </div>
            ))}
          </div>

          {/* Guest list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink4)', fontSize: 13 }}>
                No guests match this filter.
              </div>
            )}
            {filtered.map(g => (
              <GuestCard key={g.id} guest={g} selected={selectedId === g.id} onClick={setSelectedId} />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 330, borderLeft: '1px solid var(--border)', background: 'white', flexShrink: 0 }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'white', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>Guest Profile</div>
          </div>
          <GuestProfile guest={selected} onStatusChange={onStatusChange} onSaveNotes={onSaveNotes} onDelete={onDelete} onEdit={onEdit} />
        </div>
      </div>
    </>
  )
}

import React from 'react'
import { Avatar, StatusPill, UpgradeBar } from './UI'
import { hasLeft, isLeavingSoon, daysUntilDeparture, formatDaysLeft } from '../lib/dates'

export function GuestCard({ guest, selected, onClick }) {
  const departed = hasLeft(guest.depart_date)
  const leavingSoon = isLeavingSoon(guest.depart_date, 2)
  const daysLeft = daysUntilDeparture(guest.depart_date)

  return (
    <div
      onClick={() => onClick(guest.id)}
      style={{
        background: departed ? '#F8F8F8' : selected ? '#EBF6F8' : 'white',
        borderRadius: 12,
        border: `1px solid ${selected ? '#2A7D8F' : leavingSoon && !departed ? '#C0504A' : 'var(--border)'}`,
        padding: '15px 17px',
        cursor: 'pointer',
        transition: 'all .18s',
        display: 'flex',
        gap: 13,
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow)',
        opacity: departed ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = departed ? 'var(--border)' : 'var(--gold)'
          e.currentTarget.style.transform = departed ? 'none' : 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = leavingSoon && !departed ? '#C0504A' : 'var(--border)'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      <Avatar initials={guest.initials} colorIndex={guest.color_index} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
          {guest.name}
          {departed && <span style={{ fontSize: 10, background: '#E0E0E0', color: '#888', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>Departed</span>}
          {leavingSoon && !departed && <span style={{ fontSize: 10, background: '#FBF0EF', color: '#C0504A', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>⚠️ {formatDaysLeft(guest.depart_date)}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span><i className="ti ti-diamond" style={{ fontSize: 12 }} /> {guest.membership}</span>
          <span><i className="ti ti-calendar" style={{ fontSize: 12 }} /> {guest.arrival_date}</span>
          <span><i className="ti ti-moon" style={{ fontSize: 12 }} /> {guest.nights}n</span>
        </div>
        {guest.notes && (
          <div style={{
            marginTop: 7, fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {guest.notes}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
        <StatusPill status={guest.status} />
        <UpgradeBar score={guest.upgrade_score} />
      </div>
    </div>
  )
}

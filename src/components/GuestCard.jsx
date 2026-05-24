import React from 'react'
import { Avatar, StatusPill, UpgradeBar } from './UI'

export function GuestCard({ guest, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(guest.id)}
      style={{
        background: selected ? '#EBF6F8' : 'white',
        borderRadius: 12,
        border: `1px solid ${selected ? '#2A7D8F' : 'var(--border)'}`,
        padding: '15px 17px',
        cursor: 'pointer',
        transition: 'all .18s',
        display: 'flex',
        gap: 13,
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow)',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--gold)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      <Avatar initials={guest.initials} colorIndex={guest.color_index} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{guest.name}</div>
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

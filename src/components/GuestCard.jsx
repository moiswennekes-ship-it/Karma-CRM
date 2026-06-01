import React from 'react'
import { Avatar, StatusPill } from './UI'
import { hasLeft, isLeavingSoon, formatDaysLeft } from '../lib/dates'

export function GuestCard({ guest, selected, onClick, onStatusChange }) {
  const departed = hasLeft(guest.depart_date)
  const leavingSoon = isLeavingSoon(guest.depart_date, 2)

  return (
    <div
      onClick={() => onClick(guest.id)}
      style={{
        background: departed ? '#F8F8F8' : selected ? '#EBF6F8' : 'white',
        borderRadius: 12,
        border: `1px solid ${selected ? '#2A7D8F' : leavingSoon && !departed ? '#C0504A' : 'var(--border)'}`,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all .18s',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow)',
        opacity: departed ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!selected && !departed) {
          e.currentTarget.style.borderColor = 'var(--gold)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.borderColor = leavingSoon && !departed ? '#C0504A' : departed ? 'var(--border)' : 'var(--border)'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      <Avatar initials={guest.initials} colorIndex={guest.color_index} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + badges */}
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {guest.name}
          {departed && (
            <span style={{ fontSize: 10, background: '#E0E0E0', color: '#888', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>
              Departed
            </span>
          )}
          {leavingSoon && !departed && (
            <span style={{ fontSize: 10, background: '#FBF0EF', color: '#C0504A', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>
              ⚠️ {formatDaysLeft(guest.depart_date)}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          {guest.member_number && <span>#{guest.member_number}</span>}
          {guest.room && <span>· Rm {guest.room}</span>}
          <span>· {guest.arrival_date} → {guest.depart_date}</span>
          <span>· {guest.nights}n</span>
          {guest.nationality && <span>· {guest.nationality}</span>}
          {guest.linked_stay && <span>· 🔗 {guest.linked_stay}</span>}
        </div>

        {/* Membership */}
        <div style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic', marginBottom: guest.notes ? 4 : 0 }}>
          {guest.membership}
        </div>

        {/* Notes preview */}
        {guest.notes && (
          <div style={{
            fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {guest.notes}
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <StatusPill status={guest.status} />

        {/* Quick actions */}
        {!departed && onStatusChange && (
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            {guest.whatsapp && (
              <a
                href={`https://wa.me/${guest.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 8,
                  background: '#25D366', color: 'white',
                  fontSize: 14, textDecoration: 'none',
                }}
                title="Open WhatsApp"
              >
                <i className="ti ti-brand-whatsapp" />
              </a>
            )}
            {[
              { status: 'Contacted', icon: 'ti-message', color: '#6E6E73', bg: '#F3F2EE' },
              { status: 'Meeting Booked', icon: 'ti-calendar', color: '#B8762A', bg: '#FBF5EB' },
              { status: 'Follow-Up', icon: 'ti-currency-dollar', color: '#C0504A', bg: '#FBF0EF' },
              { status: 'Converted', icon: 'ti-check', color: '#2D5A3D', bg: '#EAF2ED', label: 'Deal' },
            ].filter(s => s.status !== guest.status).slice(0, 3).map(s => (
              <button
                key={s.status}
                onClick={() => onStatusChange(guest.id, s.status)}
                title={s.label || s.status}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: s.bg, color: s.color, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                <i className={`ti ${s.icon}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

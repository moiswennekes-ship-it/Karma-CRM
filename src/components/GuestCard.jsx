import React from 'react'
import { Avatar, STATUS_CFG, ALL_STATUSES } from './UI'
import { hasLeft, isLeavingSoon, formatDaysLeft, tourLabel } from '../lib/dates'
import { nextAction } from '../lib/nextAction'
import { logIcon, logAgo } from '../lib/lastLog'

// "14 Nov 26" → "14 Nov"
const short = d => (d || '?').split(/\s+/).slice(0, 2).join(' ')

function Tag({ icon, bg, color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 500, background: bg, color, borderRadius: 12, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {icon && <i className={`ti ${icon}`} />} {children}
    </span>
  )
}

// Guest card: who, when, what's next. Tap the card for the full file,
// tap the stage to change it, WhatsApp opens the chat.
export function GuestCard({ guest, selected, onClick, onStatusChange }) {
  const departed = hasLeft(guest.depart_date)
  const leavingSoon = isLeavingSoon(guest.depart_date, 2) && !departed
  const next = nextAction(guest)
  const sc = STATUS_CFG[guest.status] || STATUS_CFG['Contacted']
  const second = /\b\d+(st|nd|rd|th)\b/i.test(guest.linked_stay || '')

  return (
    <div
      onClick={() => onClick(guest.id)}
      style={{
        background: selected ? 'var(--ocean-light)' : 'white',
        borderRadius: 14,
        border: `1px solid ${selected ? 'var(--ocean2)' : 'var(--border)'}`,
        borderLeft: `4px solid ${leavingSoon ? 'var(--rose)' : sc.color}`,
        padding: '13px 14px',
        cursor: 'pointer',
        display: 'flex', gap: 12, alignItems: 'flex-start',
        boxShadow: 'var(--shadow)',
        opacity: departed ? 0.55 : 1,
      }}
    >
      <Avatar initials={guest.initials} colorIndex={guest.color_index} size={38} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</div>
          {onStatusChange ? (
            <select
              value={guest.status}
              onClick={e => e.stopPropagation()}
              onChange={e => onStatusChange(guest.id, e.target.value)}
              title="Change stage"
              style={{
                appearance: 'none', border: 'none', borderRadius: 20, padding: '4px 22px 4px 10px', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, background: sc.bg, color: sc.color, flexShrink: 0,
                backgroundImage: `linear-gradient(45deg, transparent 50%, ${sc.color} 50%), linear-gradient(135deg, ${sc.color} 50%, transparent 50%)`,
                backgroundPosition: 'calc(100% - 11px) 50%, calc(100% - 7px) 50%', backgroundSize: '4px 4px', backgroundRepeat: 'no-repeat',
              }}>
              {(ALL_STATUSES.includes(guest.status) ? ALL_STATUSES : [guest.status, ...ALL_STATUSES]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: 11.5, fontWeight: 600, background: sc.bg, color: sc.color, borderRadius: 20, padding: '4px 10px' }}>{guest.status}</span>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>
          {short(guest.arrival_date)} → {short(guest.depart_date)}{guest.nights ? ` · ${guest.nights} night${Number(guest.nights) === 1 ? '' : 's'}` : ''}{guest.room ? ` · Rm ${guest.room}` : ''}
          {guest.membership ? <span style={{ color: 'var(--ink4)' }}> · {guest.membership}</span> : null}
        </div>

        {(leavingSoon || departed || second || guest._stayKind || guest.tour_at || guest.outcome) && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
            {leavingSoon && <Tag icon="ti-clock" bg="var(--rose-light)" color="var(--rose)">{formatDaysLeft(guest.depart_date)}</Tag>}
            {departed && <Tag icon="ti-plane-departure" bg="#F1F0EC" color="#8A8A8E">Departed</Tag>}
            {guest.tour_at && <Tag icon="ti-calendar-event" bg="#FBF3E4" color="#9A6A1F">Tour {tourLabel(guest.tour_at)}</Tag>}
            {(second || guest._stayKind === 'continuing') && <Tag icon="ti-link" bg="var(--ocean-light)" color="var(--ocean)">{second ? guest.linked_stay : 'Continuing stay'}</Tag>}
            {guest._stayKind === 'returning' && <Tag icon="ti-refresh" bg="var(--ocean-light)" color="var(--ocean)">Returning</Tag>}
            {guest.outcome && <Tag icon={guest.outcome === 'won' ? 'ti-trophy' : 'ti-circle-x'} bg={guest.outcome === 'won' ? 'var(--palm-light)' : '#F1F0EC'} color={guest.outcome === 'won' ? 'var(--palm)' : '#8A8A8E'}>{guest.outcome === 'won' ? 'Won' : 'No deal'}</Tag>}
          </div>
        )}

        {guest._lastLog && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 8, fontSize: 12.5, color: 'var(--ink)', background: 'var(--sand)', borderRadius: 8, padding: '6px 9px' }}>
            <i className={`ti ${logIcon(guest._lastLog.type)}`} style={{ color: 'var(--ocean)', marginTop: 2 }} />
            <span style={{ flex: 1, minWidth: 0 }}>{guest._lastLog.content} <span style={{ color: 'var(--ink4)', whiteSpace: 'nowrap' }}>· {logAgo(guest._lastLog.created_at)}</span></span>
          </div>
        )}

        {(next || guest.whatsapp) && !departed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
            {next && (
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: next.urgent ? 'var(--rose)' : 'var(--ocean)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-arrow-right" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.action}</span>
              </div>
            )}
            {!next && <div style={{ flex: 1 }} />}
            {guest.whatsapp && (
              <a
                href={`https://wa.me/${guest.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title="Open WhatsApp"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#25D366', color: 'white', fontSize: 12, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}
              >
                <i className="ti ti-brand-whatsapp" style={{ fontSize: 14 }} /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

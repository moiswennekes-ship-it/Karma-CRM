import React from 'react'
import { daysUntilDeparture, hasLeft } from '../lib/dates'

export function ClosingWindowAlerts({ guests, onSelectGuest }) {
  const alerts = guests
    .filter(g => !hasLeft(g.depart_date) && g.status !== 'Converted' && g.status !== 'Departed')
    .map(g => {
      const daysLeft = daysUntilDeparture(g.depart_date)
      if (daysLeft === null || daysLeft < 0) return null

      let urgency = 'low'
      let reason = ''
      let action = ''

      if ((g.status === 'Hot Lead' || g.upgrade_score >= 70) && daysLeft <= 3) {
        urgency = 'critical'
        reason = `Hot lead, only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
        action = 'Book a meeting today'
      }
      else if (g.status === 'Meeting Booked' && daysLeft <= 2) {
        urgency = 'high'
        reason = `Meeting booked, leaving in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
        action = 'Prepare meeting prep + proposal'
      }
      else if (g.status === 'Follow-Up' && daysLeft <= 3) {
        urgency = 'high'
        reason = `Follow-up needed, leaving in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
        action = 'Send personalized message today'
      }
      else if (g.status === 'Arriving Soon' && daysLeft <= 2 && daysLeft >= 0) {
        urgency = 'high'
        reason = `Not yet contacted, leaving in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
        action = 'Reach out immediately'
      }
      else if (g.upgrade_score >= 60 && daysLeft >= 3 && daysLeft <= 5) {
        urgency = 'medium'
        reason = `Optimal window (${daysLeft} days left)`
        action = 'Schedule tour this week'
      }

      return urgency !== 'low' ? { guest: g, urgency, reason, action, daysLeft } : null
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 }
      return order[a.urgency] - order[b.urgency]
    })

  if (alerts.length === 0) return null

  const urgencyColors = {
    critical: { bg: 'linear-gradient(135deg, #C0504A, #8B3A36)', icon: '🎯' },
    high: { bg: 'linear-gradient(135deg, #B8762A, #8B5A20)', icon: '⚠️' },
    medium: { bg: 'linear-gradient(135deg, #2A7D8F, #1A5F6E)', icon: '⏰' },
  }

  return (
    <div style={{ marginBottom: 16, padding: '0 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-target" /> Closing Windows
        <span style={{ background: 'var(--rose-light)', color: 'var(--rose)', padding: '2px 8px', borderRadius: 10, fontSize: 10 }}>{alerts.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.slice(0, 5).map(({ guest, urgency, reason, action, daysLeft }) => {
          const u = urgencyColors[urgency]
          return (
            <div
              key={guest.id}
              onClick={() => onSelectGuest && onSelectGuest(guest.id)}
              style={{
                background: u.bg, color: 'white', borderRadius: 12,
                padding: '14px 16px', cursor: onSelectGuest ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,.1)', transition: 'transform .15s',
              }}
              onMouseEnter={e => { if (onSelectGuest) e.currentTarget.style.transform = 'translateX(2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)' }}
            >
              <div style={{ fontSize: 24, flexShrink: 0 }}>{u.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 2 }}>{guest.name}</div>
                <div style={{ fontSize: 11.5, opacity: .85 }}>{reason}</div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 3 }}>→ {action}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1 }}>{daysLeft}</div>
                <div style={{ fontSize: 9, opacity: .7, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>days left</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

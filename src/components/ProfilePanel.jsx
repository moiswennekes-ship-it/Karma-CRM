import React from 'react'
import { GuestProfile } from './GuestProfile'

// Guest profile beside the list on desktop, full-screen sheet on phones.
export function ProfilePanel({ guest, isMobile, onClose, ...profileProps }) {
  if (isMobile) {
    if (!guest) return null
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 150, overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink2)', padding: 4 }}>
            <i className="ti ti-arrow-left" />
          </button>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{guest.name}</div>
        </div>
        <GuestProfile guest={guest} stickyTop={45} {...profileProps} />
      </div>
    )
  }
  return (
    <div style={{ width: 360, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'flex', justifyContent: 'space-between' }}>
        Guest file
        {guest && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}><i className="ti ti-x" /></button>}
      </div>
      <GuestProfile guest={guest} {...profileProps} />
    </div>
  )
}

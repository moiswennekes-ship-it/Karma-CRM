import React, { useState, useEffect, useCallback } from 'react'
import { Avatar, Btn, SectionHeader } from '../components/UI'
import { GuestCard } from '../components/GuestCard'
import { GuestProfile } from '../components/GuestProfile'
import { getStaffList, getGuestsForRep } from '../lib/supabase'

// Manager-only screen: pick a rep, see their full pipeline read-only.
// RLS enforces the access control here — a non-manager account simply
// won't get rows back for anyone but themselves if they ever hit this
// screen directly, so this is a convenience view, not the security
// boundary.
export function TeamScreen({ currentStaffId }) {
  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [selectedRep, setSelectedRep] = useState(null)
  const [repGuests, setRepGuests] = useState([])
  const [loadingGuests, setLoadingGuests] = useState(false)
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStaffList()
      .then(list => setStaffList(list.filter(s => s.id !== currentStaffId)))
      .catch(err => setError(err.message))
      .finally(() => setLoadingStaff(false))
  }, [currentStaffId])

  const openRep = useCallback(async (rep) => {
    setSelectedRep(rep)
    setSelectedGuestId(null)
    setLoadingGuests(true)
    try {
      const data = await getGuestsForRep(rep.id)
      setRepGuests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingGuests(false)
    }
  }, [])

  const noop = () => {}

  if (selectedRep) {
    const selectedGuest = repGuests.find(g => g.id === selectedGuestId)
    return (
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
          background: 'var(--gold-light)', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <Btn variant="ghost" size="sm" onClick={() => setSelectedRep(null)}>
            <i className="ti ti-arrow-left" /> All Reps
          </Btn>
          <div style={{ fontSize: 12, color: 'var(--amber)' }}>
            Viewing <strong>{selectedRep.name}</strong>'s pipeline — read-only
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
            <SectionHeader title={`${selectedRep.name} (${repGuests.length} guests)`} />
            {loadingGuests ? (
              <p style={{ fontSize: 12, color: 'var(--ink3)' }}>Loading...</p>
            ) : repGuests.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--ink3)' }}>No guests assigned to this rep yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {repGuests.map(g => (
                  <GuestCard key={g.id} guest={g} selected={selectedGuestId === g.id} onClick={setSelectedGuestId} />
                ))}
              </div>
            )}
          </div>
          <div style={{ width: 330, borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>
              Guest Profile
            </div>
            <GuestProfile guest={selectedGuest} onStatusChange={noop} onSaveNotes={noop} onDelete={noop} onEdit={noop} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: 22, flex: 1 }}>
      <SectionHeader title={`Team (${staffList.length})`} />
      {error && (
        <div style={{ background: 'var(--rose-light)', border: '1px solid rgba(192,80,74,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'var(--rose)' }}>
          {error}
        </div>
      )}
      {loadingStaff ? (
        <p style={{ fontSize: 12, color: 'var(--ink3)' }}>Loading team...</p>
      ) : staffList.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--ink3)' }}>No other reps have signed up yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staffList.map(rep => (
            <div
              key={rep.id}
              onClick={() => openRep(rep)}
              style={{
                background: 'white', borderRadius: 12, border: '1px solid var(--border)',
                padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
                cursor: 'pointer', transition: 'box-shadow .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <Avatar initials={rep.avatar_initials || rep.name?.slice(0, 2).toUpperCase()} colorIndex={0} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{rep.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{rep.email} · {rep.role || 'Member Relations'}</div>
              </div>
              {rep.is_manager && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: 'var(--gold-light)', color: 'var(--gold)' }}>
                  Manager
                </span>
              )}
              <i className="ti ti-chevron-right" style={{ color: 'var(--ink4)' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

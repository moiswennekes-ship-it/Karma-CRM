import React, { useState, useEffect } from 'react'
import { Modal, Btn, FieldInput, FieldSelect, FieldTextarea, FieldLabel } from './UI'

const MEMBER_TYPES = [
  'Legacy Member', 'Standard Member', 'Premium Member',
  'Fractional Owner', 'Entry Member', 'KC Member', 'Prospective',
]

const STATUSES = [
  'Arriving Soon', 'Contacted', 'Responded', 'Meeting Booked',
  'Follow-Up', 'Hot Lead', 'Proposal Sent', 'Converted',
]

export function EditGuestModal({ guest, open, onClose, onSave }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (guest) setForm({ ...guest })
  }, [guest])

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(guest.id, form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!guest) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit — ${guest.name}`}
      subtitle="Update guest details, membership and contact information."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="ocean" onClick={handleSave} disabled={saving}>
            <i className="ti ti-check" /> {saving ? 'Saving...' : 'Save Changes'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Full Name</FieldLabel>
          <FieldInput value={form.name} onChange={set('name')} placeholder="Guest full name" />
        </div>
        <div>
          <FieldLabel>Member Type</FieldLabel>
          <FieldSelect value={form.member_type} onChange={set('member_type')} options={MEMBER_TYPES} />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <FieldSelect value={form.status} onChange={set('status')} options={STATUSES} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Membership / Points</FieldLabel>
          <FieldInput value={form.membership} onChange={set('membership')} placeholder="e.g. 198 / Full / 14 years" />
        </div>
        <div>
          <FieldLabel>WhatsApp</FieldLabel>
          <FieldInput value={form.whatsapp} onChange={set('whatsapp')} placeholder="+61 422 345 678" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <FieldInput value={form.email} onChange={set('email')} placeholder="guest@email.com" type="email" />
        </div>
        <div>
          <FieldLabel>Nationality</FieldLabel>
          <FieldInput value={form.nationality} onChange={set('nationality')} placeholder="e.g. Australian" />
        </div>
        <div>
          <FieldLabel>Party</FieldLabel>
          <FieldInput value={form.party} onChange={set('party')} placeholder="e.g. Couple + 2 kids" />
        </div>
        <div>
          <FieldLabel>Arrival Date</FieldLabel>
          <FieldInput value={form.arrival_date} onChange={set('arrival_date')} placeholder="e.g. 23 May 26" />
        </div>
        <div>
          <FieldLabel>Departure Date</FieldLabel>
          <FieldInput value={form.depart_date} onChange={set('depart_date')} placeholder="e.g. 30 May 26" />
        </div>
        <div>
          <FieldLabel>Nights</FieldLabel>
          <FieldInput value={form.nights} onChange={v => set('nights')(Number(v))} placeholder="7" type="number" />
        </div>
        <div>
          <FieldLabel>Last Stay</FieldLabel>
          <FieldInput value={form.last_stay} onChange={set('last_stay')} placeholder="e.g. 2 years ago" />
        </div>
        <div>
          <FieldLabel>Room</FieldLabel>
          <FieldInput value={form.room} onChange={set('room')} placeholder="e.g. 58" />
        </div>
        <div>
          <FieldLabel>Upgrade Score (%)</FieldLabel>
          <FieldInput value={form.upgrade_score} onChange={v => set('upgrade_score')(Number(v))} placeholder="0-100" type="number" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Notes</FieldLabel>
          <FieldTextarea value={form.notes} onChange={set('notes')} placeholder="Key observations, interests, potential opportunities..." rows={4} />
        </div>
      </div>
    </Modal>
  )
}

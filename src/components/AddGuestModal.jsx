import React, { useState } from 'react'
import { Modal, Btn, FieldInput, FieldSelect, FieldTextarea, FieldLabel } from './UI'

const MEMBER_TYPES = [
  'Legacy Member', 'Standard Member', 'Premium Member',
  'Fractional Owner', 'Entry Member', 'Prospective',
]

const DEFAULT_FORM = {
  name: '', email: '', whatsapp: '', membership: '', member_type: 'Standard Member',
  arrival_date: '', depart_date: '', nights: 7, party: '', last_stay: '', notes: '',
}

export function AddGuestModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
      setForm(DEFAULT_FORM)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Guest"
      subtitle="Create a member record to begin tracking their journey."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="ocean" onClick={handleSave} disabled={saving || !form.name.trim()}>
            <i className="ti ti-check" /> {saving ? 'Saving...' : 'Save Guest'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Full Name *</FieldLabel>
          <FieldInput value={form.name} onChange={set('name')} placeholder="e.g. James & Lisa Wong" />
        </div>
        <div>
          <FieldLabel>Member Type</FieldLabel>
          <FieldSelect value={form.member_type} onChange={set('member_type')} options={MEMBER_TYPES} />
        </div>
        <div>
          <FieldLabel>Membership / Points</FieldLabel>
          <FieldInput value={form.membership} onChange={set('membership')} placeholder="e.g. 96 Annual Points" />
        </div>
        <div>
          <FieldLabel>WhatsApp</FieldLabel>
          <FieldInput value={form.whatsapp} onChange={set('whatsapp')} placeholder="+65 9123 4567" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <FieldInput value={form.email} onChange={set('email')} placeholder="guest@email.com" type="email" />
        </div>
        <div>
          <FieldLabel>Party</FieldLabel>
          <FieldInput value={form.party} onChange={set('party')} placeholder="e.g. Couple + 2 kids" />
        </div>
        <div>
          <FieldLabel>Nights</FieldLabel>
          <FieldInput value={form.nights} onChange={v => set('nights')(Number(v))} placeholder="7" type="number" />
        </div>
        <div>
          <FieldLabel>Arrival</FieldLabel>
          <FieldInput value={form.arrival_date} onChange={set('arrival_date')} placeholder="e.g. Today, 3:00 PM" />
        </div>
        <div>
          <FieldLabel>Departure</FieldLabel>
          <FieldInput value={form.depart_date} onChange={set('depart_date')} placeholder="e.g. Jun 5" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Last Stay</FieldLabel>
          <FieldInput value={form.last_stay} onChange={set('last_stay')} placeholder="e.g. 2 years ago / First visit" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FieldLabel>Notes</FieldLabel>
          <FieldTextarea value={form.notes} onChange={set('notes')} placeholder="Key observations, interests, potential opportunities..." rows={3} />
        </div>
      </div>
    </Modal>
  )
}

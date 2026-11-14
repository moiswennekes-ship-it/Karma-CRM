// Latest thing Mois logged on a guest, for cards and lists
const ICON = { whatsapp: 'ti-brand-whatsapp', note: 'ti-notes', meeting: 'ti-calendar', email: 'ti-mail', outcome: 'ti-flag' }

export function logIcon(type) { return ICON[type] || 'ti-notes' }

export function logAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

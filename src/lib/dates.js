// ── DATE UTILITIES ─────────────────────────────────────────────
// Parses Karma leadsheet date formats like "23 May 26", "8 Jun 26", "Today, 2:00 PM"

const MONTHS = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
}

export function parseKarmaDate(dateStr) {
  if (!dateStr) return null
  const s = dateStr.toLowerCase().trim()

  // "today" or "today, 2:00 PM"
  if (s.startsWith('today')) {
    const d = new Date()
    d.setHours(23, 59, 59, 0)
    return d
  }

  // "23 may 26" or "23 may 2026"
  const parts = s.split(/[\s,]+/).filter(Boolean)
  if (parts.length >= 3) {
    const day = parseInt(parts[0])
    const mon = MONTHS[parts[1]?.substring(0, 3)]
    let yr = parseInt(parts[2])
    if (yr < 100) yr += 2000
    if (!isNaN(day) && mon !== undefined && !isNaN(yr)) {
      return new Date(yr, mon, day, 23, 59, 59)
    }
  }

  // Try native date parse as fallback
  const native = new Date(dateStr)
  if (!isNaN(native)) return native

  return null
}

export function isToday(dateStr) {
  const d = parseKarmaDate(dateStr)
  if (!d) return false
  // Use Bali timezone (UTC+8)
  const baliOffset = 8 * 60
  const now = new Date()
  const baliNow = new Date(now.getTime() + (baliOffset - now.getTimezoneOffset()) * 60000)
  const baliD = new Date(d.getTime() + (baliOffset - d.getTimezoneOffset()) * 60000)
  return baliD.getDate() === baliNow.getDate() &&
    baliD.getMonth() === baliNow.getMonth() &&
    baliD.getFullYear() === baliNow.getFullYear()
}

export function isPast(dateStr) {
  const d = parseKarmaDate(dateStr)
  if (!d) return false
  return d < new Date()
}

export function isFuture(dateStr) {
  const d = parseKarmaDate(dateStr)
  if (!d) return false
  return d > new Date()
}

export function daysUntilDeparture(departDateStr) {
  const d = parseKarmaDate(departDateStr)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  return diff
}

export function isInHouse(arrivalStr, departStr) {
  const now = new Date()
  const arrival = parseKarmaDate(arrivalStr)
  const depart = parseKarmaDate(departStr)
  if (!arrival || !depart) return false
  return arrival <= now && depart >= now
}

export function isLeavingSoon(departStr, thresholdDays = 2) {
  const days = daysUntilDeparture(departStr)
  if (days === null) return false
  return days >= 0 && days <= thresholdDays
}

export function hasLeft(departStr) {
  return isPast(departStr)
}

export function formatDaysLeft(departStr) {
  const days = daysUntilDeparture(departStr)
  if (days === null) return ''
  if (days < 0) return 'Departed'
  if (days === 0) return 'Leaving today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

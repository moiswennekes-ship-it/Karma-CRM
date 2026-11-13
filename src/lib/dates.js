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
  // Compare calendar days (midnight to midnight). parseKarmaDate sets the
  // time to 23:59:59, which made Math.ceil count the departure day as an
  // extra full day (e.g. leaving the 15th on the 13th showed "3 days").
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const departDay = new Date(d)
  departDay.setHours(0, 0, 0, 0)
  return Math.round((departDay - today) / (1000 * 60 * 60 * 24))
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

// ── KARMA WEEK NUMBER ─────────────────────────────────────────
// Karma weeks run Saturday to Friday. Week 1 starts on the first
// Saturday of the year (e.g. Sat 3 Jan 2026), so Fri 13 Nov 2026 is
// Week 45 and Sat 14 Nov 2026 starts Week 46. Uses Bali time (UTC+8).
export function karmaWeek(date = new Date()) {
  const bali = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60000)
  const day = Date.UTC(bali.getFullYear(), bali.getMonth(), bali.getDate())
  const firstSaturday = (year) => {
    const jan1 = new Date(Date.UTC(year, 0, 1))
    return Date.UTC(year, 0, 1 + ((6 - jan1.getUTCDay() + 7) % 7))
  }
  let start = firstSaturday(bali.getFullYear())
  if (day < start) start = firstSaturday(bali.getFullYear() - 1)
  return Math.floor((day - start) / (7 * 86400000)) + 1
}

// The year a Karma week belongs to (early January before the first
// Saturday still counts as the previous year's last week).
export function karmaYear(date = new Date()) {
  const bali = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60000)
  const y = bali.getFullYear()
  const day = Date.UTC(y, bali.getMonth(), bali.getDate())
  const jan1 = new Date(Date.UTC(y, 0, 1))
  const firstSat = Date.UTC(y, 0, 1 + ((6 - jan1.getUTCDay() + 7) % 7))
  return day < firstSat ? y - 1 : y
}

// Saturday–Friday dates (e.g. "14 Nov 2026") for the Karma week containing `date`.
export function karmaWeekRange(date = new Date()) {
  const bali = new Date(date.getTime() + (8 * 60 + date.getTimezoneOffset()) * 60000)
  const day = Date.UTC(bali.getFullYear(), bali.getMonth(), bali.getDate())
  const sinceSat = (new Date(day).getUTCDay() + 1) % 7   // Sat=0 … Fri=6
  const start = new Date(day - sinceSat * 86400000)
  const end = new Date(start.getTime() + 6 * 86400000)
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return { start: fmt(start), end: fmt(end) }
}

// ── CALENDAR / TOUR HELPERS (Bali time) ───────────────────────
// Day keys are 'YYYY-MM-DD' strings so comparisons don't depend on the
// device's timezone.
const BALI_TZ = 'Asia/Makassar'
const pad = n => String(n).padStart(2, '0')

export function baliTodayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BALI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Leadsheet date ("14 Nov 26") → '2026-11-14'
export function stayKey(dateStr) {
  const d = parseKarmaDate(dateStr)
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : null
}

export function addDaysKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n, 12))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

// Saturday that starts the Karma week containing `key`
export function weekStartKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()   // Sun=0 … Sat=6
  return addDaysKey(key, -((dow + 1) % 7))
}

export function keyLabel(key, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })
}

// Tour timestamp → Bali day key and 'HH:MM'
export function tourDayKey(iso) { return iso ? baliTodayKey(new Date(iso)) : null }
export function tourTime(iso) {
  return iso ? new Intl.DateTimeFormat('en-GB', { timeZone: BALI_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : ''
}
export function tourLabel(iso) {
  return iso ? `${keyLabel(tourDayKey(iso))}, ${tourTime(iso)}` : ''
}
// '2026-11-17' + '10:00' → ISO timestamp in Bali time
export function tourIso(dayKey, time) {
  return dayKey && time ? `${dayKey}T${time}:00+08:00` : null
}

// "2:00 PM" / "14:00" → "14:00"
export function to24h(t) {
  const m = String(t || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*([ap]\.?m\.?)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const ap = (m[3] || '').toLowerCase()
  if (ap.startsWith('p') && h < 12) h += 12
  if (ap.startsWith('a') && h === 12) h = 0
  return h < 24 ? `${pad(h)}:${m[2]}` : null
}

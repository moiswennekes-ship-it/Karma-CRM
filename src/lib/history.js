// ── GUEST HISTORY ──────────────────────────────────────────────
// Matches guests by member number so a returning member is recognised,
// and a linked stay (2nd week) is told apart from a fresh return.
import { parseKarmaDate } from './dates'

const norm = n => (n == null ? '' : String(n).trim().toLowerCase())
const day = s => { const d = parseKarmaDate(s); return d ? new Date(d).setHours(0, 0, 0, 0) : null }

// Earlier stays of the same member, most recent first.
export function pastStaysFor(guest, guests) {
  const num = norm(guest?.member_number)
  if (!num) return []
  const arr = day(guest.arrival_date)
  return guests
    .filter(g => g.id !== guest.id && norm(g.member_number) === num)
    .filter(g => {
      const a = day(g.arrival_date)
      return arr == null || a == null ? g.created_at < guest.created_at : a < arr
    })
    .sort((a, b) => (day(b.arrival_date) || 0) - (day(a.arrival_date) || 0))
    .map(g => ({
      id: g.id, week_number: g.week_number, week_year: g.week_year,
      arrival_date: g.arrival_date, depart_date: g.depart_date,
      status: g.status, outcome: g.outcome, outcome_reason: g.outcome_reason, notes: g.notes,
    }))
}

// 'continuing' when the last stay ends the day this one starts (a linked
// 2nd week), 'returning' for a member who has been here before.
export function stayKind(guest, past) {
  if (!past?.length) return null
  const last = past[0]
  const end = day(last.depart_date), start = day(guest.arrival_date)
  if (end != null && start != null && Math.abs(start - end) <= 86400000) return 'continuing'
  return 'returning'
}

// Adds _past and _stayKind to each guest. Fields starting with "_" are
// never saved to the database (see editGuest).
export function withHistory(guests) {
  return guests.map(g => {
    const past = pastStaysFor(g, guests)
    return past.length ? { ...g, _past: past, _stayKind: stayKind(g, past) } : g
  })
}

export function weekTag(s) {
  return s.week_number ? `Week ${s.week_number}${s.week_year ? ` ${s.week_year}` : ''}` : (s.arrival_date || 'earlier')
}

// One line per earlier stay, for Guru and the profile.
export function pastStayLine(s) {
  const outcome = s.outcome === 'lost' ? `no deal${s.outcome_reason ? `: ${s.outcome_reason}` : ''}`
    : s.outcome === 'won' ? `bought${s.outcome_reason ? `: ${s.outcome_reason}` : ''}` : null
  return `${weekTag(s)} (${s.arrival_date || '?'} → ${s.depart_date || '?'}): stage ${s.status}${outcome ? `, ${outcome}` : ''}${s.notes ? `. Notes: ${s.notes}` : ''}`
}

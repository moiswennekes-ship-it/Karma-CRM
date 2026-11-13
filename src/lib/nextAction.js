// ── NEXT BEST ACTION ──────────────────────────────────────────
// One suggested next step per active guest, with a reason and a score
// used to rank the Today list. Rule-based so it's instant and free;
// Ask Guru gives the deeper, AI-written version on the guest profile.

import { daysUntilDeparture, hasLeft, isInHouse, isToday, parseKarmaDate } from './dates'

export function isClosed(g) {
  return g.status === 'Converted' || g.status === 'Departed' || g.outcome === 'lost' || hasLeft(g.depart_date)
}

function isSecondWeek(g) {
  return (g.linked_stay || '').toLowerCase().includes('2nd')
}

export function nextAction(g) {
  if (isClosed(g)) return null
  const days = daysUntilDeparture(g.depart_date)
  const left = days === null ? '' : days === 0 ? 'leaves today' : days === 1 ? 'leaves tomorrow' : `${days} days left`
  const urgent = days !== null && days <= 2
  const arrivingToday = isToday(g.arrival_date) && !isSecondWeek(g)
  const inHouse = isInHouse(g.arrival_date, g.depart_date)

  let score = 0, action = '', reason = ''

  switch (g.status) {
    case 'Hot Lead':
      score = urgent ? 100 : 80
      action = urgent ? 'Close it: book a final sit-down today' : 'Book the meeting and agree a decision date'
      reason = `Hot lead, ${left}`
      break
    case 'Meeting Booked':
      score = urgent ? 85 : 70
      action = 'Prep the meeting: ask Guru for a briefing'
      reason = `Meeting booked, ${left}`
      break
    case 'Follow-Up':
      score = urgent ? 82 : 60
      action = 'Send a personal follow-up today'
      reason = `Waiting on a follow-up, ${left}`
      break
    case 'Contacted':
      score = urgent ? 65 : 35
      action = urgent ? 'Push for a coffee or tour before they leave' : 'Check in and suggest a coffee or tour'
      reason = `Contacted, no meeting yet, ${left}`
      break
    default: { // Arriving Soon
      if (isSecondWeek(g)) {
        score = urgent ? 60 : 40
        action = 'Check in: ask how the first week went'
        reason = `Staying on for another week${left ? `, ${left}` : ''}`
      } else if (arrivingToday) {
        score = 68; action = 'Send the welcome message'; reason = 'Arrives today'
      } else if (inHouse) {
        score = urgent ? 75 : 50
        action = 'Make first contact'
        reason = `In house, not contacted yet, ${left}`
      } else {
        const arr = parseKarmaDate(g.arrival_date)
        score = 15
        action = 'Prepare the welcome'
        reason = arr ? `Arrives ${g.arrival_date}` : 'Arriving soon'
      }
    }
  }
  if (isSecondWeek(g)) score -= 10
  return { score, action, reason, urgent }
}

export function rankGuests(guests) {
  return guests
    .map(g => ({ guest: g, next: nextAction(g) }))
    .filter(x => x.next)
    .sort((a, b) => b.next.score - a.next.score)
}

// ── NEXT BEST ACTION ──────────────────────────────────────────
// One suggested next step per active guest, with a reason and a score
// used to rank the Today list. Rule-based so it's instant and free;
// Ask Guru gives the deeper, AI-written version on the guest profile.

import { daysUntilDeparture, hasLeft, isInHouse, isToday, parseKarmaDate } from './dates'

export function isClosed(g) {
  return g.status === 'Converted' || g.status === 'Departed' || g.outcome === 'lost' || hasLeft(g.depart_date)
}

// "2nd weeks", "3rd weeks" etc: the guest is continuing a stay with us.
function isSecondWeek(g) {
  return /\b\d+(st|nd|rd|th)\b/i.test(g.linked_stay || '')
}

function arrivesLater(g) {
  const arr = parseKarmaDate(g.arrival_date)
  if (!arr) return false
  const today = new Date(); today.setHours(23, 59, 59, 0)
  return arr > today
}

export function nextAction(g) {
  if (isClosed(g)) return null
  const days = daysUntilDeparture(g.depart_date)
  const left = days === null ? '' : days === 0 ? 'leaves today' : days === 1 ? 'leaves tomorrow' : `${days} days left`
  const urgent = days !== null && days <= 2
  const arrivingToday = isToday(g.arrival_date) && !isSecondWeek(g)
  const inHouse = isInHouse(g.arrival_date, g.depart_date)

  let score = 0, action = '', reason = ''
  const notes = (g.notes || '').toLowerCase()
  const later = arrivesLater(g)
  const arrivalText = `Arrives ${g.arrival_date}${g.nights ? `, ${g.nights} nights` : ''}`

  // Instructions from the leadsheet notes come first
  if (/book this week/.test(notes) && !['Meeting Booked', 'Hot Lead', 'Converted'].includes(g.status)) {
    return { score: 92, action: 'Book their tour this week', reason: `Leadsheet: "${g.notes}"`, urgent: true }
  }
  if (/\btoured\b/.test(notes) && ['Arriving Soon', 'Contacted'].includes(g.status)) {
    return { score: urgent ? 78 : 58, action: 'Follow up on their tour', reason: `${g.notes}${left ? `, ${left}` : ''}`, urgent }
  }
  // Not here yet: plan for the stay, don't count down the days
  if (later && ['Arriving Soon', 'Contacted'].includes(g.status)) {
    if (g.status === 'Contacted') {
      return { score: 25, action: 'Line up a coffee or tour for their stay', reason: `Welcome sent. ${arrivalText}`, urgent: false }
    }
  }

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

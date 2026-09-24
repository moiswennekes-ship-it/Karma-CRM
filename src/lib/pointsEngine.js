// Pure scoring logic for the Points Passport survey. No React, no I/O — every
// function takes the config + survey responses it needs and returns a value,
// so it's easy to unit-test and safe to call from any screen.

import { ROOM_TYPES, ROOM_TYPES_POINTS, MATRIX_POINTS, MATRIX_FRACTIONAL, MATRIX_POINTS_ELITE } from './pointsPassportConfig'

// ── matrix lookups ─────────────────────────────────────────────

function matrixCellIn(matrixObj, tier, roomTypeId, seasonId) {
  const t = matrixObj[tier]
  if (!t) return null
  const rt = t[roomTypeId]
  if (!rt) return null
  return rt[seasonId] || null
}

export function isElite(responses) {
  return responses.ownership === 'points' && !!responses.pointsElite
}

export function guestMatrix(responses) {
  return responses.ownership === 'fractional' ? MATRIX_FRACTIONAL : MATRIX_POINTS
}

export function guestRoomTypeList(responses) {
  return responses.ownership === 'fractional' ? ROOM_TYPES : ROOM_TYPES_POINTS
}

function eliteCell(roomTypeId, seasonId) {
  const rt = MATRIX_POINTS_ELITE[roomTypeId]
  return rt ? (rt[seasonId] || null) : null
}

export function availableRoomTypes(responses, tier) {
  if (isElite(responses)) {
    return ROOM_TYPES_POINTS.filter(rt => !!eliteCell(rt.id, 'red') || !!eliteCell(rt.id, 'white') || !!eliteCell(rt.id, 'blue'))
  }
  const m = guestMatrix(responses)
  const rts = guestRoomTypeList(responses)
  return rts.filter(rt => !!matrixCellIn(m, tier, rt.id, 'red') || !!matrixCellIn(m, tier, rt.id, 'white') || !!matrixCellIn(m, tier, rt.id, 'blue'))
}

export function defaultRoomFor(responses, tier) {
  const avail = availableRoomTypes(responses, tier)
  if (!avail.length) return null
  if (responses.accommodation && avail.some(rt => rt.id === responses.accommodation)) return responses.accommodation
  // fall back to the largest room this ownership type / tier allows
  return avail[avail.length - 1].id
}

// eliteOverride: pass true/false to force-evaluate the Elite vs standard rate,
// regardless of what the guest actually is — used for the on-screen savings
// comparison. Leave undefined to use the guest's real status.
export function pointsForStay(responses, tier, roomTypeId, seasonId, nights, eliteOverride) {
  const useElite = eliteOverride !== undefined ? eliteOverride : isElite(responses)
  const c = useElite ? eliteCell(roomTypeId, seasonId) : matrixCellIn(guestMatrix(responses), tier, roomTypeId, seasonId)
  if (!c || !nights) return 0
  const fullWeeks = Math.floor(nights / 7)
  const rem = nights % 7
  return fullWeeks * c.w + rem * c.d
}

// ── survey-level totals ────────────────────────────────────────

export function nightsVal(responses) {
  if (responses.length === 'custom') return parseFloat(responses.lengthCustom) || 0
  return parseFloat(responses.length) || 0
}

export function tripsVal(responses) {
  if (responses.trips === 'custom') return parseFloat(responses.tripsCustom) || 0
  return parseFloat(responses.trips) || 0
}

export function roomLabel(id) {
  const rt = ROOM_TYPES.find(x => x.id === id)
  return rt ? rt.label : '—'
}

// Returns one row per selected destination: { dest, tpy, room, nights, perStay, subtotal }
export function destBreakdown(responses, destinations, eliteOverride) {
  const nights = nightsVal(responses)
  return destinations
    .filter(d => !!responses.dest[d.id])
    .map(d => {
      const sel = responses.dest[d.id]
      const perStay = pointsForStay(responses, d.tier, sel.room, responses.season, nights, eliteOverride)
      const subtotal = perStay * sel.tpy
      return { dest: d, tpy: sel.tpy, room: sel.room, nights, perStay, subtotal }
    })
}

export function totalPoints(responses, destinations, eliteOverride) {
  return destBreakdown(responses, destinations, eliteOverride).reduce((sum, row) => sum + row.subtotal, 0)
}

// ── current ownership ──────────────────────────────────────────

export function currentCatalog(responses, packages, fractionalPackages) {
  if (responses.ownership === 'points') return packages
  if (responses.ownership === 'fractional') return fractionalPackages
  return null
}

export function currentPackage(responses, packages, fractionalPackages) {
  const cat = currentCatalog(responses, packages, fractionalPackages)
  if (!cat) return null
  return cat.find(x => x.id === responses.currentPackageId) || null
}

export function currentPointsOwned(responses, packages, fractionalPackages) {
  const p = currentPackage(responses, packages, fractionalPackages)
  if (!p) return 0
  if (responses.ownership === 'points' && responses.packageFrequency === 'biannual') return p.pts / 2
  return p.pts
}

export function currentPackageLabel(responses, packages, fractionalPackages) {
  const p = currentPackage(responses, packages, fractionalPackages)
  if (!p) return '—'
  if (responses.ownership === 'points' && responses.packageFrequency === 'biannual') return p.name + ' (Bi-Annual)'
  return p.name
}

// ── recommendations ────────────────────────────────────────────

// { sorted, hit, next, overTop } — hit is the cheapest package that covers the
// total, next is the tier above it, overTop is the top tier when nothing covers it.
export function matchInCatalog(list, total) {
  const sorted = [...list].sort((a, b) => a.pts - b.pts)
  let hit = null
  let next = null
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].pts >= total) {
      hit = sorted[i]
      next = sorted[i + 1] || null
      break
    }
  }
  return { sorted, hit, next, overTop: !hit && sorted.length ? sorted[sorted.length - 1] : null }
}

// The cheapest package that would cover the total if points are banked across
// `bankingYears` years instead of spent fresh every year.
export function bankedMatch(list, total, bankingYears) {
  const sorted = [...list].sort((a, b) => a.pts - b.pts)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].pts * bankingYears >= total) return sorted[i]
  }
  return null
}

export function fmt(n) {
  const rounded = Math.round(n * 10) / 10
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

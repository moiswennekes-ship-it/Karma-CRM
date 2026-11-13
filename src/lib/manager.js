// ── MANAGER VIEW HELPERS ──────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { withHistory } from './history'
import { baliTodayKey, stayKey, addDaysKey, weekStartKey } from './dates'

export const UNTOUCHED_DAYS = 2
const OPEN = ['Arriving Soon', 'Contacted']
const isLogged = a => a.type !== 'status_change'

// A lead is untouched when the guest checked in 2+ days ago, is still in
// house, has no tour booked, isn't closed, and nothing has been logged on
// them (WhatsApp, note, meeting, email) since they arrived.
export function untouchedLeads(guests, interactions, today = baliTodayKey()) {
  const cutoff = addDaysKey(today, -UNTOUCHED_DAYS)
  return guests.filter(g => {
    const arr = stayKey(g.arrival_date), dep = stayKey(g.depart_date)
    if (!arr || !dep || arr > cutoff || dep < today) return false
    if (!OPEN.includes(g.status) || g.outcome || g.tour_at) return false
    return !interactions.some(a => a.guest_id === g.id && isLogged(a) && a.created_at.slice(0, 10) >= arr)
  }).map(g => {
    const arr = stayKey(g.arrival_date)
    const [y, m, d] = arr.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number)
    const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000)
    return { guest: g, daysIn: days }
  }).sort((a, b) => b.daysIn - a.daysIn)
}

// Per-rep numbers for the current Karma week (guests whose stay overlaps it).
export function repStats(rep, guests, interactions, today = baliTodayKey()) {
  const start = weekStartKey(today), end = addDaysKey(start, 6)
  const mine = guests.filter(g => g.assigned_to === rep.id)
  const week = mine.filter(g => { const a = stayKey(g.arrival_date), d = stayKey(g.depart_date); return a && d && a <= end && d >= start })
  const ids = new Set(mine.map(g => g.id))
  const logs = interactions.filter(a => ids.has(a.guest_id) && isLogged(a))
  const weekLogs = logs.filter(a => a.created_at.slice(0, 10) >= start)
  return {
    guests: week.length,
    toursBooked: week.filter(g => g.tour_at || g.status === 'Tour Booked').length,
    toured: week.filter(g => ['Toured', 'Follow-Up', 'Hot Lead', 'Converted'].includes(g.status)).length,
    converted: week.filter(g => g.status === 'Converted').length,
    logged: weekLogs.length,
    lastActivity: logs.length ? logs.reduce((m, a) => (a.created_at > m ? a.created_at : m), logs[0].created_at) : null,
  }
}

// Every rep's guests plus logged activity from the last 21 days (managers only).
export function useTeamActivity(enabled) {
  const [interactions, setInteractions] = useState([])
  const [teamGuests, setTeamGuests] = useState([])
  const load = useCallback(async () => {
    if (!enabled) return
    const since = new Date(Date.now() - 21 * 86400000).toISOString()
    const [{ data: acts }, { data: gs }] = await Promise.all([
      supabase.from('interactions')
        .select('id, guest_id, type, content, created_at, staff_name')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
      supabase.from('guests').select('*').order('created_at', { ascending: false }),
    ])
    setInteractions(acts || [])
    setTeamGuests(withHistory(gs || []))
  }, [enabled])
  useEffect(() => {
    load()
    if (!enabled) return
    const t = setInterval(load, 5 * 60 * 1000)   // refresh every 5 minutes
    return () => clearInterval(t)
  }, [load, enabled])
  return { interactions, teamGuests, reload: load }
}

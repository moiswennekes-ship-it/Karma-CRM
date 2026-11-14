import { useState, useEffect, useCallback, useMemo } from 'react'
import { isArrivingToday } from '../lib/nextAction'
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  subscribeToGuests,
  logInteraction,
  supabase,
} from '../lib/supabase'
import { hasLeft, parseKarmaDate, karmaWeek, karmaYear } from '../lib/dates'

export function useGuests(assignedTo, staffName) {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Latest thing logged on each guest (WhatsApp, note, meeting, email)
  const [lastLogs, setLastLogs] = useState({})

  const loadLastLogs = useCallback(async (ids) => {
    if (!ids.length) { setLastLogs({}); return }
    const { data } = await supabase.from('interactions')
      .select('guest_id, type, content, created_at')
      .neq('type', 'status_change').in('guest_id', ids)
      .order('created_at', { ascending: false }).limit(2000)
    const map = {}
    for (const a of data || []) if (!map[a.guest_id]) map[a.guest_id] = a
    setLastLogs(map)
  }, [])

  // Initial load
  const loadGuests = useCallback(async () => {
    try {
      setLoading(true)
      if (!assignedTo) { setGuests([]); return }
      const data = await getGuests(assignedTo)

      // Auto-update status to 'Departed' for guests whose departure date has
      // passed, but ONLY if nobody ever worked the lead (still the default
      // 'Arriving Soon'). Do not clobber a real pipeline stage (Contacted,
      // Meeting Booked, Hot Lead, Proposal Sent, Follow-Up, Converted) just
      // because the guest's stay ended — staff may still be following up
      // after departure, and overwriting silently here with no interaction
      // log previously destroyed that history.
      const toUpdate = data.filter(g =>
        hasLeft(g.depart_date) && g.status === 'Arriving Soon'
      )
      for (const g of toUpdate) {
        await updateGuest(g.id, { status: 'Departed' })
        g.status = 'Departed'
      }

      setGuests(data)
      loadLastLogs(data.map(g => g.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [assignedTo, loadLastLogs])

  useEffect(() => {
    loadGuests()

    // Real-time subscription — updates live when another tab/user changes data
    const subscription = subscribeToGuests((payload) => {
      if (payload.eventType === 'INSERT') {
        if (assignedTo && payload.new.assigned_to !== assignedTo) return
        setGuests(prev => prev.some(g => g.id === payload.new.id) ? prev : [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setGuests(prev => prev.map(g => g.id === payload.new.id ? payload.new : g))
      } else if (payload.eventType === 'DELETE') {
        setGuests(prev => prev.filter(g => g.id !== payload.old.id))
      }
    })

    // New WhatsApps / notes / meetings show up as the guest's latest log
    const logChannel = supabase.channel('interactions-latest')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, ({ new: a }) => {
        if (a.type === 'status_change') return
        setLastLogs(prev => ({ ...prev, [a.guest_id]: a }))
      })
      .subscribe()

    return () => { subscription.unsubscribe(); supabase.removeChannel(logChannel) }
  }, [loadGuests, assignedTo])

  // Guests with their latest logged note attached (as _lastLog)
  const guestsWithLogs = useMemo(
    () => guests.map(g => (lastLogs[g.id] ? { ...g, _lastLog: lastLogs[g.id] } : g)),
    [guests, lastLogs],
  )

  // Add a new guest
  const addGuest = useCallback(async (guestData) => {
    const initials = guestData.name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('')

    // File under the Karma week (and year) the guest arrives in.
    const arrives = parseKarmaDate(guestData.arrival_date) || new Date()
    const newGuest = {
      week_number: karmaWeek(arrives),
      week_year: karmaYear(arrives),
      week_label: `Week ${karmaWeek(arrives)}`,
      ...guestData,
      initials,
      status: guestData.status || 'Arriving Soon',
      upgrade_score: 0,
      color_index: guests.length % 5,
      assigned_to: guestData.assigned_to || assignedTo || null,
    }
    const created = await createGuest(newGuest)
    return created
  }, [guests.length, assignedTo])

  // Update a guest field or fields
  const editGuest = useCallback(async (id, rawUpdates) => {
    // Drop computed fields (_past, _stayKind) that aren't database columns.
    const updates = Object.fromEntries(Object.entries(rawUpdates).filter(([k]) => !k.startsWith('_')))
    // Immediately update local state for instant UI
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    // Then persist to database
    const updated = await updateGuest(id, updates)
    if (updates.status) {
      await logInteraction({
        guest_id: id,
        type: 'status_change',
        content: `Stage changed to ${updates.status}`,
        staff_name: staffName || null,
      }).catch(() => {})
    }
    return updated
  }, [staffName])

  // Update status specifically
  const updateStatus = useCallback(async (id, status) => {
    return editGuest(id, { status })
  }, [editGuest])

  // Save notes
  const saveNotes = useCallback(async (id, notes) => {
    return editGuest(id, { notes })
  }, [editGuest])

  // Remove a guest
  const removeGuest = useCallback(async (id) => {
    // Immediately remove from local state for instant UI update
    setGuests(prev => prev.filter(g => g.id !== id))
    // Then delete from database
    await deleteGuest(id)
  }, [])

  // Computed: pipeline counts
  const pipelineCounts = {
    arriving: guests.filter(g => g.status === 'Arriving Soon').length,
    contacted: guests.filter(g => g.status === 'Contacted').length,
    tourBooked: guests.filter(g => g.status === 'Tour Booked').length,
    toured: guests.filter(g => g.status === 'Toured').length,
    hotLead: guests.filter(g => g.status === 'Hot Lead').length,
    converted: guests.filter(g => g.status === 'Converted').length,
    followUp: guests.filter(g => g.status === 'Follow-Up').length,
  }

  // Computed: today's arrivals
  const todayArrivals = guests.filter(g =>
    isArrivingToday(g)
  )

  // Computed: hot leads (score >= 65)
  const hotLeads = guests.filter(g => g.status === 'Hot Lead')

  return {
    guests: guestsWithLogs,
    loading,
    error,
    addGuest,
    editGuest,
    updateStatus,
    saveNotes,
    removeGuest,
    pipelineCounts,
    todayArrivals,
    hotLeads,
    reload: loadGuests,
  }
}

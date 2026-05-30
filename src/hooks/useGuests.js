import { useState, useEffect, useCallback } from 'react'
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  subscribeToGuests,
  logInteraction,
} from '../lib/supabase'
import { hasLeft, isToday } from '../lib/dates'

export function useGuests() {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initial load
  const loadGuests = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getGuests()

      // Auto-update status to 'Departed' for guests whose departure date has passed
      const toUpdate = data.filter(g =>
        hasLeft(g.depart_date) && g.status !== 'Departed' && g.status !== 'Converted'
      )
      for (const g of toUpdate) {
        await updateGuest(g.id, { status: 'Departed' })
        g.status = 'Departed'
      }

      setGuests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGuests()

    // Real-time subscription — updates live when another tab/user changes data
    const subscription = subscribeToGuests((payload) => {
      if (payload.eventType === 'INSERT') {
        setGuests(prev => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setGuests(prev => prev.map(g => g.id === payload.new.id ? payload.new : g))
      } else if (payload.eventType === 'DELETE') {
        setGuests(prev => prev.filter(g => g.id !== payload.old.id))
      }
    })

    return () => subscription.unsubscribe()
  }, [loadGuests])

  // Add a new guest
  const addGuest = useCallback(async (guestData) => {
    const initials = guestData.name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('')

    const newGuest = {
      ...guestData,
      initials,
      status: guestData.status || 'Arriving Soon',
      upgrade_score: guestData.upgrade_score || 50,
      color_index: guests.length % 5,
    }
    const created = await createGuest(newGuest)
    return created
  }, [guests.length])

  // Update a guest field or fields
  const editGuest = useCallback(async (id, updates) => {
    // Immediately update local state for instant UI
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    // Then persist to database
    const updated = await updateGuest(id, updates)
    if (updates.status) {
      await logInteraction({
        guest_id: id,
        type: 'status_change',
        content: `Status updated to: ${updates.status}`,
      })
    }
    return updated
  }, [])

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
    meetingBooked: guests.filter(g => g.status === 'Meeting Booked').length,
    hotLead: guests.filter(g => ['Hot Lead', 'Proposal Sent'].includes(g.status)).length,
    converted: guests.filter(g => g.status === 'Converted').length,
    followUp: guests.filter(g => g.status === 'Follow-Up').length,
  }

  // Computed: today's arrivals
  const todayArrivals = guests.filter(g =>
    g.arrival_date && isToday(g.arrival_date) && !(g.linked_stay || '').toLowerCase().includes('2nd')
  )

  // Computed: hot leads (score >= 65)
  const hotLeads = guests.filter(g => g.upgrade_score >= 65)

  return {
    guests,
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

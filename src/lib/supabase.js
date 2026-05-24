import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── GUESTS ────────────────────────────────────────────────────

export async function getGuests() {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createGuest(guest) {
  const { data, error } = await supabase
    .from('guests')
    .insert([guest])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGuest(id, updates) {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGuest(id) {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── INTERACTIONS ──────────────────────────────────────────────

export async function getInteractions(guestId) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function logInteraction(interaction) {
  const { data, error } = await supabase
    .from('interactions')
    .insert([interaction])
    .select()
    .single()
  if (error) throw error
  return data
}

// ── AI MESSAGES ───────────────────────────────────────────────

export async function saveAIMessage(msg) {
  const { data, error } = await supabase
    .from('ai_messages')
    .insert([msg])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAIMessages(guestId) {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── OBJECTIONS ────────────────────────────────────────────────

export async function saveObjectionResponse(obj) {
  const { data, error } = await supabase
    .from('objection_responses')
    .insert([obj])
    .select()
    .single()
  if (error) throw error
  return data
}

// ── REAL-TIME SUBSCRIPTION ────────────────────────────────────
// Call this in your top-level component to get live updates

export function subscribeToGuests(callback) {
  return supabase
    .channel('guests-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, callback)
    .subscribe()
}

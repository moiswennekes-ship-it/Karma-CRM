import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Manages the Supabase Auth session plus the signed-in user's own `staff`
// row (name, email, is_manager). The `staff` row is created/linked
// automatically by a database trigger the moment someone signs up, so by
// the time a session exists there should always be a matching staff row.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadStaff = useCallback(async (sess) => {
    if (!sess) {
      setStaff(null)
      return
    }
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', sess.user.id)
      .maybeSingle()
    if (error) {
      setError(error.message)
      return
    }
    setStaff(data)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      setSession(session)
      await loadStaff(session)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadStaff(session)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadStaff])

  const signUp = useCallback(async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    session,
    staff,
    isManager: !!staff?.is_manager,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  }
}

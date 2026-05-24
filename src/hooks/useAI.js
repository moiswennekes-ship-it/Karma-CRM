import { useState, useCallback } from 'react'
import {
  generateWelcomeWhatsApp,
  generateWelcomeEmail,
  generateMeetingPrep,
  generateFollowUp,
  generateProposal,
  generateObjectionResponse,
  generateOpportunityInsight,
} from '../lib/claude'
import { saveAIMessage } from '../lib/supabase'

export function useAI() {
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (fn, guest, messageType, extraArgs = []) => {
    setLoading(true)
    setError(null)
    setOutput('')
    try {
      const text = await fn(guest, ...extraArgs)
      setOutput(text)
      // Persist to Supabase for the learning loop
      if (guest?.id) {
        await saveAIMessage({
          guest_id: guest.id,
          message_type: messageType,
          output: text,
          was_sent: false,
        }).catch(() => {}) // non-blocking
      }
      return text
    } catch (err) {
      setError(err.message)
      setOutput('Unable to connect to AI. Check your API key in .env and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    output,
    loading,
    error,
    clear: () => { setOutput(''); setError(null) },

    welcomeWhatsApp: (guest) => run(generateWelcomeWhatsApp, guest, 'welcome_whatsapp'),
    welcomeEmail: (guest) => run(generateWelcomeEmail, guest, 'welcome_email'),
    meetingPrep: (guest, ctx) => run(generateMeetingPrep, guest, 'meeting_prep', [ctx]),
    followUp: (guest, notes, fmt) => run(generateFollowUp, guest, 'followup', [notes, fmt]),
    proposal: (guest, type, highlights) => run(generateProposal, guest, 'proposal', [type, highlights]),
    objection: (obj, ctx, tone) => run(
      (g, ...a) => generateObjectionResponse(...a),
      null, 'objection', [obj, ctx, tone]
    ),
    insight: (guest) => run(generateOpportunityInsight, guest, 'insight'),
  }
}

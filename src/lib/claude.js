// ── CLAUDE AI SERVICE ─────────────────────────────────────────
// All AI calls go through this file. In production, route these
// through a Supabase Edge Function to keep your API key private.


const CLAUDE_API_URL = '/api/claude';
const MODEL = 'claude-sonnet-4-5'

async function callClaude(prompt, maxTokens = 900) {
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Claude API error')
  }
  const data = await res.json()
  return data.content?.map(c => c.text || '').join('') || ''
}

// ── WELCOME MESSAGE ───────────────────────────────────────────

export async function generateWelcomeWhatsApp(guest) {
  const prompt = `You are a warm, professional member relations manager at Karma Collection, a luxury resort group in Bali. Write a personalized WhatsApp welcome message for this arriving guest.

Guest profile:
- Name: ${guest.name}
- Membership: ${guest.membership} (${guest.member_type})
- Arriving: ${guest.arrival_date}, staying ${guest.nights} nights
- Party: ${guest.party}
- Last stay: ${guest.last_stay}
- Notes: ${guest.notes}

Guidelines:
- Warm, personal, not salesy
- 3–4 short paragraphs maximum
- Reference their specific membership or history naturally
- End with a soft, low-pressure invitation to connect for coffee
- Use 1–2 relevant emojis (🌴 🌊 😊) — not excessive
- Sign off as Mois, Member Relations, Karma Collection

Do not mention upgrades or sales directly.`
  return callClaude(prompt)
}

export async function generateWelcomeEmail(guest) {
  const prompt = `You are a warm, professional member relations manager at Karma Collection Bali. Write a personalized welcome email.

Guest profile:
- Name: ${guest.name}
- Membership: ${guest.membership} (${guest.member_type})
- Arriving: ${guest.arrival_date}, staying ${guest.nights} nights
- Party: ${guest.party}
- Last stay: ${guest.last_stay}
- Notes: ${guest.notes}

Format:
Subject: [write a warm, personalized subject line]

[email body — 3–4 paragraphs, warm hospitality tone, end with invitation for complimentary welcome coffee]

Warm regards,
Mois Wennekes
Member Relations | Karma Kandara, Bali`
  return callClaude(prompt)
}

// ── MEETING PREP ──────────────────────────────────────────────

export async function generateMeetingPrep(guest, extraContext = '') {
  const prompt = `You are preparing a luxury resort member relations manager for a guest meeting. Provide a concise briefing.

Guest: ${guest.name}
Membership: ${guest.membership} (${guest.member_type})
Party: ${guest.party} | Last stay: ${guest.last_stay}
Upgrade score: ${guest.upgrade_score}/100
Notes: ${guest.notes}
${extraContext ? `Additional context: ${extraContext}` : ''}

Format your response with these sections:
**Member Summary**
[2–3 sentence overview]

**Key Opportunity**
[What is the single biggest opportunity with this guest?]

**Suggested Talking Points**
• [point 1]
• [point 2]
• [point 3]
• [point 4]

**Likely Objections & How to Handle**
[2–3 objections they might raise and how to respond]

**Recommended Next Step**
[One clear, specific action]`
  return callClaude(prompt, 1000)
}

// ── FOLLOW-UP ─────────────────────────────────────────────────

export async function generateFollowUp(guest, meetingNotes, format = 'whatsapp') {
  const prompt = `You are a luxury resort member relations manager. Write a ${format === 'email' ? 'professional follow-up email' : 'warm WhatsApp follow-up message'} after meeting with a guest.

Guest: ${guest.name} | ${guest.membership}
Meeting notes: ${meetingNotes || guest.notes}

Guidelines:
- Reference specific things discussed in the meeting
- Keep it warm and personal, not formulaic
- Include a clear next step or call to action
- ${format === 'email' ? 'Include a subject line. 3–4 paragraphs.' : '2–3 short paragraphs. Conversational tone.'}
- Sign from Mois, Member Relations`
  return callClaude(prompt)
}

// ── PROPOSAL ─────────────────────────────────────────────────

export async function generateProposal(guest, proposalType, highlights = '') {
  const prompt = `Write a personalized ${proposalType} proposal for a Karma Collection member. Warm and educational — not a hard sell.

Guest: ${guest.name}
Current membership: ${guest.membership} (${guest.member_type})
Party: ${guest.party} | Notes: ${guest.notes}
${highlights ? `Key points to highlight: ${highlights}` : ''}

Include:
1. Personal opening that references their history with Karma
2. What changes with ${proposalType}
3. Estimated 5-year and 10-year cost comparison (use realistic estimates)
4. Key benefits: equity, flexibility, exit value, upgraded experiences
5. Warm close with invitation to discuss further

Professional but personal tone. Not too long — this is an introduction, not a legal document.`
  return callClaude(prompt, 1200)
}

// ── OBJECTION HANDLER ─────────────────────────────────────────

export async function generateObjectionResponse(objection, guestContext = '', tone = 'Warm & empathetic') {
  const prompt = `You are an expert luxury resort membership consultant. A guest raised this objection:

"${objection}"

${guestContext ? `Guest context: ${guestContext}` : ''}
Tone: ${tone}

Write a response that:
- Acknowledges and validates their concern genuinely
- Offers a reframe or new perspective with facts where useful
- Does not feel pushy or dismissive
- Ends with a soft next step or question
- Is conversational — 3–4 short paragraphs

Do not use phrases like "Great question!" or "I understand your concern" as openers — start with something more natural.`
  return callClaude(prompt)
}

// ── OPPORTUNITY SCAN ─────────────────────────────────────────

export async function generateOpportunityInsight(guest) {
  const prompt = `In 2–3 sentences, explain the key membership opportunity or relationship strategy for this resort guest. Be specific and actionable. No fluff.

${guest.name} | ${guest.membership} (${guest.member_type})
Last stay: ${guest.last_stay} | Upgrade score: ${guest.upgrade_score}/100
Notes: ${guest.notes}`
  return callClaude(prompt, 300)
}

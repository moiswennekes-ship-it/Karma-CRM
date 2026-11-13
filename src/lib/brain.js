// ── KARMA BRAIN ───────────────────────────────────────────────
// Products/prices and lessons the AI is allowed to draw on.
// Every product carries a source tier, an effective date and a
// "verify" flag so the AI can say how sure it is.

import { supabase } from './supabase'

export const PRODUCT_CATEGORIES = ['Discovery', 'Points', 'Fractional', 'Other']
export const SOURCE_TIERS = ['official', 'internal', 'personal', 'unverified']
export const LESSON_KINDS = ['objection', 'strategy', 'success', 'failure', 'lesson']

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveProduct(product) {
  const { id, ...fields } = product
  const q = id
    ? supabase.from('products').update(fields).eq('id', id)
    : supabase.from('products').insert([fields])
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function getLessons(limit = 50) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function saveLesson(lesson) {
  const { id, ...fields } = lesson
  const q = id
    ? supabase.from('lessons').update(fields).eq('id', id)
    : supabase.from('lessons').insert([fields])
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteLesson(id) {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

// Small cache so every Ask Guru question doesn't re-download the Brain.
let cache = { at: 0, products: [], lessons: [] }
export async function loadBrain(force = false) {
  if (!force && Date.now() - cache.at < 2 * 60 * 1000) return cache
  const [products, lessons] = await Promise.all([
    getProducts().catch(() => []),
    getLessons(30).catch(() => []),
  ])
  cache = { at: Date.now(), products, lessons }
  return cache
}
export function clearBrainCache() { cache.at = 0 }

export function brainContext({ products, lessons }) {
  const active = products.filter(p => p.active !== false)
  const productLines = active.length
    ? active.map(p => {
        const flags = [p.source_tier || 'unverified', p.effective_date ? `effective ${p.effective_date}` : null, p.verify ? 'VERIFY BEFORE QUOTING' : null]
          .filter(Boolean).join(', ')
        return `- [${p.category}] ${p.name}: ${p.summary || ''}${p.price_text ? ` | Price: ${p.price_text}` : ''}${p.terms ? ` | Terms: ${p.terms}` : ''} (${flags})`
      }).join('\n')
    : '- (No products in the Brain yet. Do not quote any prices.)'
  const lessonLines = lessons.length
    ? lessons.slice(0, 20).map(l => `- (${l.kind}) ${l.content}`).join('\n')
    : '- (No lessons logged yet.)'
  return `KARMA BRAIN — the only product and price facts you may use:
${productLines}

When you quote a product marked VERIFY BEFORE QUOTING, add "(verify before presenting)".

MOIS'S LESSONS — what has worked or failed before, use these:
${lessonLines}`
}

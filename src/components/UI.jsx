import React, { useState } from 'react'

// ── STATUS CONFIG ─────────────────────────────────────────────
export const STATUS_CFG = {
  'Arriving Soon':  { bg: '#EBF6F8', color: '#1A5F6E' },
  'Contacted':      { bg: '#F3F2EE', color: '#6E6E73' },
  'Responded':      { bg: '#FBF5EB', color: '#B8762A' },
  'Meeting Booked': { bg: '#FBF5EB', color: '#B8762A' },
  'Follow-Up':      { bg: '#FBF0EF', color: '#C0504A' },
  'Hot Lead':       { bg: '#FBF0EF', color: '#C0504A' },
  'Proposal Sent':  { bg: '#EAF2ED', color: '#2D5A3D' },
  'Converted':      { bg: '#EAF2ED', color: '#2D5A3D' },
  'Departed':       { bg: '#F0F0F0', color: '#888888' },
}

export const AVATAR_COLORS = [
  { bg: '#EBF6F8', color: '#1A5F6E' },
  { bg: '#EAF2ED', color: '#2D5A3D' },
  { bg: '#FBF0EF', color: '#C0504A' },
  { bg: '#FBF5EB', color: '#B8762A' },
  { bg: '#F0EDFC', color: '#5A3DB8' },
]

export const ALL_STATUSES = ['Arriving Soon', 'Contacted', 'Responded', 'Meeting Booked', 'Follow-Up', 'Hot Lead', 'Proposal Sent', 'Converted', 'Departed']

// ── AVATAR ────────────────────────────────────────────────────
export function Avatar({ initials, colorIndex = 0, size = 40 }) {
  const ac = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ac.bg, color: ac.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 500, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── STATUS PILL ───────────────────────────────────────────────
export function StatusPill({ status }) {
  const sc = STATUS_CFG[status] || STATUS_CFG['Contacted']
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: 10.5, fontWeight: 500, whiteSpace: 'nowrap',
      background: sc.bg, color: sc.color,
    }}>
      {status}
    </span>
  )
}

// ── UPGRADE BAR ───────────────────────────────────────────────
export function UpgradeBar({ score }) {
  const color = score > 70 ? '#C0504A' : score > 50 ? '#B8762A' : '#AEAEB2'
  return (
    <div style={{ textAlign: 'right', fontSize: 11, minWidth: 90 }}>
      <div style={{ color }}>↑ {score}% upgrade</div>
      <div style={{ width: 80, height: 3, background: '#E0D7C8', borderRadius: 2, marginTop: 4 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .5s' }} />
      </div>
    </div>
  )
}

// ── BUTTON ────────────────────────────────────────────────────
export function Btn({ children, variant = 'ocean', size = 'md', onClick, style = {}, disabled }) {
  const variants = {
    ocean:  { background: '#1A5F6E', color: 'white', border: 'none' },
    ghost:  { background: 'transparent', color: '#3A3A3C', border: '1px solid rgba(184,145,74,0.32)' },
    gold:   { background: '#B8914A', color: 'white', border: 'none' },
    green:  { background: '#25D366', color: 'white', border: 'none' },
    amber:  { background: '#FBF5EB', color: '#B8762A', border: '1px solid rgba(184,118,42,0.2)' },
    danger: { background: '#FBF0EF', color: '#C0504A', border: '1px solid rgba(192,80,74,0.2)' },
  }
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 11 },
    md: { padding: '8px 14px', fontSize: 12 },
    lg: { padding: '10px 18px', fontSize: 13 },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: 8, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)', transition: 'all .15s',
        opacity: disabled ? 0.5 : 1,
        ...variants[variant], ...sizes[size], ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, right }) {
  return (
    <div style={{
      padding: '14px 16px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink2)' }}>
        {title}
      </div>
      {right}
    </div>
  )
}

export function CardBody({ children, style = {} }) {
  return <div style={{ padding: '16px', ...style }}>{children}</div>
}

// ── AI OUTPUT BOX ─────────────────────────────────────────────
export function AIOutputBox({ output, loading, onCopy, onRegenerate }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(output).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  if (!loading && !output) return null

  return (
    <div>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--ink3)', fontSize: 12 }}>
          <div className="dot-pulse"><span /><span /><span /></div>
          Generating with Claude AI...
        </div>
      )}
      {output && (
        <>
          <div style={{
            border: '1px solid var(--border2)', borderRadius: 10,
            background: 'var(--sand)', padding: 13, marginBottom: 10,
            fontSize: 12, lineHeight: 1.65, color: 'var(--ink2)',
            whiteSpace: 'pre-wrap',
          }}>
            {output}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <Btn variant="ghost" size="sm" onClick={handleCopy}>
              <i className={`ti ti-${copied ? 'check' : 'copy'}`} />
              {copied ? 'Copied!' : 'Copy'}
            </Btn>
            {onRegenerate && (
              <Btn variant="ghost" size="sm" onClick={onRegenerate}>
                <i className="ti ti-refresh" /> Regenerate
              </Btn>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── FIELD COMPONENTS ──────────────────────────────────────────
export function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)', display: 'block', marginBottom: 5 }}>
      {children}
    </label>
  )
}

export function FieldInput({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
        padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13,
        color: 'var(--ink)', background: 'var(--sand)', marginBottom: 12,
        outline: 'none', ...style,
      }}
    />
  )
}

export function FieldSelect({ value, onChange, options, style = {} }) {
  return (
    <select
      value={value || ''} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
        padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13,
        color: 'var(--ink)', background: 'var(--sand)', marginBottom: 12,
        appearance: 'none', cursor: 'pointer', outline: 'none', ...style,
      }}
    >
      {options.map(o => (
        <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
  )
}

export function FieldTextarea({ value, onChange, placeholder, rows = 4, style = {} }) {
  return (
    <textarea
      value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: '100%', border: '1px solid var(--border2)', borderRadius: 8,
        padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 12,
        color: 'var(--ink)', background: 'var(--sand)', resize: 'none',
        lineHeight: 1.5, marginBottom: 12, outline: 'none', ...style,
      }}
    />
  )
}

// ── SLIDER ────────────────────────────────────────────────────
export function SliderField({ label, value, min, max, step = 1, onChange, format }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink3)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ocean)' }}>{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ocean)', cursor: 'pointer' }}
      />
    </div>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────
export function SectionHeader({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--ink3)' }}>
        {title}
      </div>
      {right}
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────
export function StatCard({ label, value, hint, hintColor, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '16px 20px', background: 'white',
      borderRight: '1px solid var(--border)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background .15s',
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--sand)' }}
    onMouseLeave={e => e.currentTarget.style.background = 'white'}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink3)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: 'var(--ink)' }}>{value}</div>
      {hint && <div style={{ fontSize: 11, marginTop: 4, color: hintColor || 'var(--ink3)' }}>{hint}</div>}
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(24,24,26,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, padding: 24,
          width: 500, maxHeight: '88vh', overflowY: 'auto',
          boxShadow: 'var(--shadow2)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 20 }}>{subtitle}</div>}
        {children}
        {footer && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

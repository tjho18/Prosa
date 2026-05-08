'use client'

interface CoverProps {
  title: string
  author: string
  bg?: string
  ink?: string
  accent?: string
  layout?: 'banded' | 'rule' | 'centered' | 'minimal'
  imageUrl?: string
  w?: number
  h?: number
}

export default function BookCover({
  title, author,
  bg = '#2a3a2a', ink = '#ebe4d4', accent = '#8a3a2a',
  layout = 'banded', imageUrl, w = 180, h = 270,
}: CoverProps) {
  const titleSize = Math.max(13, Math.round(w / 11))
  const authorSize = Math.max(9, Math.round(w / 22))
  const pad = Math.round(w * 0.08)

  // If an uploaded image is provided, show it directly
  if (imageUrl) {
    return (
      <div style={{
        width: w, height: h, position: 'relative', flexShrink: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.12) inset, -1px 0 0 rgba(0,0,0,0.2) inset, 6px 10px 20px rgba(0,0,0,0.15)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(90deg,rgba(0,0,0,0.25),transparent)', pointerEvents: 'none' }} />
      </div>
    )
  }

  const inner = (() => {
    if (layout === 'banded') return (
      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 2, background: accent, marginBottom: pad * 0.7 }} />
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500, fontSize: titleSize, lineHeight: 1.05 }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ height: 1, background: ink, opacity: 0.4, marginBottom: pad * 0.5 }} />
        <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: authorSize, opacity: 0.9 }}>{author}</div>
      </div>
    )
    if (layout === 'rule') return (
      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(8, w / 26), letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>Prosa Editions</div>
        <div>
          <div style={{ height: 1, background: ink, opacity: 0.4, marginBottom: pad * 0.5 }} />
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: titleSize, lineHeight: 1, fontStyle: 'italic' }}>{title}</div>
          <div style={{ height: 1, background: ink, opacity: 0.4, marginTop: pad * 0.5 }} />
        </div>
        <div style={{ fontFamily: 'EB Garamond, serif', fontSize: authorSize, opacity: 0.85 }}>{author}</div>
      </div>
    )
    if (layout === 'centered') return (
      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 18, height: 1, background: accent, marginBottom: pad * 0.6 }} />
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: titleSize * 0.95, lineHeight: 1.05 }}>{title}</div>
        <div style={{ width: 18, height: 1, background: accent, marginTop: pad * 0.6 }} />
        <div style={{ marginTop: 'auto', fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: authorSize }}>{author}</div>
      </div>
    )
    return (
      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontSize: authorSize, opacity: 0.7 }}>{author}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500, fontSize: titleSize * 1.1, lineHeight: 0.98 }}>{title}</div>
      </div>
    )
  })()

  return (
    <div style={{
      width: w, height: h, position: 'relative', flexShrink: 0,
      background: bg, color: ink,
      boxShadow: '0 1px 0 rgba(0,0,0,0.12) inset, -1px 0 0 rgba(0,0,0,0.2) inset, 6px 10px 20px rgba(40,30,20,0.18)',
      overflow: 'hidden', borderRadius: 2,
    }}>
      {inner}
      {/* grain */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`, mixBlendMode: 'overlay', opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(90deg,rgba(0,0,0,0.2),transparent)', pointerEvents: 'none' }} />
    </div>
  )
}

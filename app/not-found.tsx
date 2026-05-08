import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--sans)', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 20px' }}>404</p>
      <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.1, margin: '0 0 16px', color: 'var(--ink)' }}>
        Page not found.
      </h1>
      <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--ink-mute)', margin: '0 0 32px', maxWidth: 420, lineHeight: 1.6 }}>
        This shelf is empty. The page may have moved or never existed.
      </p>
      <Link href="/" className="btn-ghost">Return to the shelf</Link>
    </div>
  )
}

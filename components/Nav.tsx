'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import SearchModal from './SearchModal'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const isHome = pathname === '/'

  // Dark mode palette for the home showcase page
  const navBg     = isHome ? 'rgba(7,10,15,0.88)'           : 'var(--paper)'
  const navBorder = isHome ? 'rgba(255,255,255,0.07)'        : 'var(--rule)'
  const wordmark  = isHome ? '#e8e4dc'                       : 'var(--ink)'
  const linkColor = isHome ? 'rgba(140,168,190,0.65)'        : 'var(--ink-mute)'
  const iconColor = isHome ? 'rgba(140,168,190,0.55)'        : 'var(--ink-mute)'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setDrawerOpen(false)
    router.push('/')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: navBg,
        borderBottom: `1px solid ${navBorder}`,
        height: 'var(--nav-height)',
        backdropFilter: isHome ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: isHome ? 'blur(14px)' : 'none',
        transition: 'background 300ms, border-color 300ms',
      }}>
        <div style={{
          maxWidth: 'var(--wide-width)', margin: '0 auto',
          padding: '0 var(--page-pad)',
          height: '100%',
          display: 'flex', alignItems: 'center', gap: 0,
        }}>
          {/* Wordmark */}
          <Link href="/" style={{ textDecoration: 'none', color: wordmark, flexShrink: 0, marginRight: 'clamp(16px,3vw,40px)', transition: 'color 300ms' }}>
            <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em' }}>
              Prosa
            </span>
          </Link>

          {/* Desktop nav links — hidden on homepage */}
          {!isHome && (
            <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Link href="/" style={{ fontFamily: 'var(--sans)', fontSize: 13, color: linkColor, textDecoration: 'none', padding: '0 14px', letterSpacing: '0.02em' }}>
                Explore
              </Link>
            </nav>
          )}

          <div style={{ flex: 1 }} />

          {/* Right actions */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: iconColor, display: 'flex', padding: '4px 8px', transition: 'color 300ms' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            {user ? (
              <>
                <Link href="/write" style={{
                  fontFamily: 'var(--sans)', fontSize: 13, color: linkColor,
                  textDecoration: 'none', letterSpacing: '0.02em', padding: '0 10px',
                  transition: 'color 300ms',
                }}>
                  Write
                </Link>
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ background: isHome ? 'rgba(255,255,255,0.08)' : 'var(--paper-deep)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transition: 'background 300ms' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: iconColor }}>
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" style={{ fontFamily: 'var(--sans)', fontSize: 13, color: linkColor, textDecoration: 'none', padding: '0 10px', letterSpacing: '0.02em', transition: 'color 300ms' }}>
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '7px 18px',
                    background: isHome ? 'rgba(232,228,220,0.12)' : 'var(--ink)',
                    color: isHome ? 'rgba(232,228,220,0.85)' : '#fff',
                    border: isHome ? '1px solid rgba(232,228,220,0.2)' : 'none',
                    borderRadius: 999,
                    fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500,
                    textDecoration: 'none', letterSpacing: '0.02em',
                    transition: 'all 300ms',
                  }}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="nav-hamburger"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: iconColor, display: 'none', marginLeft: 8, transition: 'color 300ms' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <style>{`
        @media (max-width: 640px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }}
        >
          <nav
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 304,
              background: 'var(--paper)', overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 32px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 24, fontWeight: 500, color: 'var(--ink)' }}>Prosa</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
              <DrawerLink href="/" label="Home" icon="home" active={pathname === '/'} onClick={() => setDrawerOpen(false)} />
              {user && <DrawerLink href="/?tab=following" label="Following" icon="following" active={false} onClick={() => setDrawerOpen(false)} />}
            </div>

            {user && (
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                <DrawerLink href="/write" label="Write" icon="write" active={pathname.startsWith('/write')} onClick={() => setDrawerOpen(false)} />
                <DrawerLink href="/profile" label="Profile" icon="profile" active={pathname === '/profile'} onClick={() => setDrawerOpen(false)} />
              </div>
            )}

            {user ? (
              <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid var(--rule)' }}>
                <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--ink-mute)', padding: 0 }}>
                  Sign out
                </button>
              </div>
            ) : (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                <Link href="/signup" className="btn-ink" onClick={() => setDrawerOpen(false)} style={{ textAlign: 'center', justifyContent: 'center' }}>Get started</Link>
                <Link href="/signin" className="btn-ghost" onClick={() => setDrawerOpen(false)} style={{ textAlign: 'center', justifyContent: 'center' }}>Sign in</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  )
}

function DrawerLink({ href, label, icon, active, onClick }: {
  href: string; label: string; icon: string; active: boolean; onClick: () => void
}) {
  const icons: Record<string, React.ReactNode> = {
    home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    following: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    write: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    profile: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  }
  return (
    <Link href={href} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 24px', textDecoration: 'none',
      color: active ? 'var(--ink)' : 'var(--ink-mute)',
      fontFamily: 'var(--sans)', fontSize: 16,
      fontWeight: active ? 600 : 400,
      background: active ? 'var(--paper-deep)' : 'transparent',
    }}>
      {icons[icon]}
      {label}
    </Link>
  )
}

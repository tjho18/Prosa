'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Link from 'next/link'

export default function ProfileEditor({ profile: initial }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('profiles').update({
      display_name: profile.display_name,
      bio: profile.bio,
    }).eq('id', profile.id)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(40px,6vw,72px) var(--page-pad) clamp(24px,3vw,36px)' }}>
        <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 10px' }}>
              Your account
            </p>
            <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px,3.5vw,40px)', margin: 0, lineHeight: 1.1, color: 'var(--ink)' }}>
              Edit profile
            </h1>
          </div>
          <Link href={`/profile/${profile.username}`} style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none' }}>
            View public page →
          </Link>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────── */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(40px,5vw,64px) var(--page-pad)' }}>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Username (read-only) */}
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 8px' }}>
              Username
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--ink-mute)', margin: 0, padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
              @{profile.username}
            </p>
          </div>

          {/* Display name */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
              Display name
            </span>
            <input
              type="text"
              value={profile.display_name ?? ''}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              style={fieldStyle}
              onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--ink)'}
              onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--rule)'}
            />
          </label>

          {/* Bio */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
              Bio
            </span>
            <textarea
              value={profile.bio ?? ''}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              placeholder="A few words about yourself…"
              style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.65 }}
              onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--ink)'}
              onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--rule)'}
            />
          </label>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4 }}>
            <button type="submit" className="btn-ink" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--accent)' }}>
                Saved ✓
              </span>
            )}
          </div>
        </form>

        {/* Sign out */}
        <div style={{ marginTop: 60, paddingTop: 28, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={signOut} style={{
            fontFamily: 'var(--sans)', fontSize: 13, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--ink-mute)', padding: 0,
          }}>
            Sign out
          </button>
          <Link href="/write" style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'none' }}>
            Writing desk →
          </Link>
        </div>
      </div>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: 15, padding: '10px 0', background: 'transparent',
  border: 'none', borderBottom: '1px solid var(--rule)', color: 'var(--ink)', outline: 'none', width: '100%',
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) { setError('Incorrect email or password.'); setLoading(false); return }
    router.push('/write')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      {/* Top brand strip */}
      <div style={{ textAlign: 'center', padding: '40px 24px 0' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 600 }}>Prosa</span>
        </Link>
        <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-mute)', margin: '8px 0 0' }}>
          Welcome back.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AuthField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required />
            <AuthField label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="current-password" required />

            {error && <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: '#c0392b', margin: 0 }}>{error}</p>}

            <button type="submit" className="btn-ink" disabled={loading}
              style={{ marginTop: 8, justifyContent: 'center', opacity: loading ? 0.6 : 1, borderRadius: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-mute)', margin: 0 }}>
              No account?{' '}
              <Link href="/signup" style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--rule)' }}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
      <input {...props} style={{ fontFamily: 'var(--sans)', fontSize: 15, padding: '10px 14px', background: 'var(--paper)', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, color: 'var(--ink)', outline: 'none', width: '100%' }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--ink)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'}
      />
    </label>
  )
}

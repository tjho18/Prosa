'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

// ─── Utilities ────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

/**
 * Split full novel text into chapters.
 * Detects chapter breaks as lines containing only a number (1–999),
 * optionally preceded by "Chapter " (case-insensitive).
 */
function parseChapters(text: string): Array<{ number: number; raw: string }> {
  // Matches a line that is ONLY a chapter marker, e.g. "1", "2", "Chapter 3"
  const marker = /^[ \t]*(?:chapter\s+)?(\d{1,3})[ \t]*$/im
  const parts = text.split(new RegExp(`^[ \\t]*(?:chapter\\s+)?(\\d{1,3})[ \\t]*$`, 'im'))

  const chapters: Array<{ number: number; raw: string }> = []
  for (let i = 1; i < parts.length - 1; i += 2) {
    const num = parseInt(parts[i], 10)
    const raw = (parts[i + 1] ?? '').trim()
    if (num >= 1 && raw.length > 0) {
      chapters.push({ number: num, raw })
    }
  }
  return chapters
}

/** Convert a plain-text block into TipTap-compatible HTML paragraphs. */
function toHtml(raw: string): string {
  return raw
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => `<p>${l}</p>`)
    .join('')
}

function wordCount(raw: string): number {
  return raw.trim().split(/\s+/).filter(Boolean).length
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ParsedChapter {
  number: number
  raw: string
}

type Step = 'input' | 'preview' | 'uploading' | 'done' | 'error'

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [status, setStatus] = useState<'serial' | 'complete'>('complete')
  const [text, setText] = useState('')

  // Flow state
  const [step, setStep] = useState<Step>('input')
  const [parsed, setParsed] = useState<ParsedChapter[]>([])
  const [log, setLog] = useState<string[]>([])
  const [parseError, setParseError] = useState('')
  const [doneSlug, setDoneSlug] = useState('')

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/signin')
      } else {
        setUser(data.user)
        setAuthLoading(false)
      }
    })
  }, [router, supabase])

  // ── Parse step ──────────────────────────────────────────────────────────────

  function handleParse() {
    setParseError('')
    if (!title.trim()) { setParseError('Please enter a novel title.'); return }
    if (!text.trim()) { setParseError('Please paste the full novel text.'); return }

    const chapters = parseChapters(text)

    if (chapters.length === 0) {
      setParseError(
        'No chapters detected. Make sure each chapter starts with a line containing only its number, e.g.:\n\n1\nChapter content...\n\n2\nNext chapter...'
      )
      return
    }

    setParsed(chapters)
    setStep('preview')
  }

  // ── Upload step ─────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!user) return
    setStep('uploading')
    setLog([])

    const addLog = (msg: string) => setLog(prev => [...prev, msg])

    // 1. Find or create novel
    addLog('Looking for existing novel…')
    const slug = slugify(title)

    let novelId: string | null = null

    // Try slug
    const { data: bySlug } = await supabase
      .from('novels').select('id').eq('slug', slug).maybeSingle()
    if (bySlug) { novelId = (bySlug as { id: string }).id; addLog(`Found novel by slug "${slug}".`) }

    // Try title (case-insensitive)
    if (!novelId) {
      const { data: byTitle } = await supabase
        .from('novels').select('id').ilike('title', title.trim()).maybeSingle()
      if (byTitle) { novelId = (byTitle as { id: string }).id; addLog('Found novel by title.') }
    }

    // Try any novel by this user
    if (!novelId) {
      const { data: anyNovel } = await supabase
        .from('novels').select('id, title').eq('author_id', user.id).limit(1).maybeSingle()
      if (anyNovel) {
        const n = anyNovel as { id: string; title: string }
        novelId = n.id
        addLog(`Found your novel "${n.title}" — will replace its chapters.`)
      }
    }

    // Create from scratch
    if (!novelId) {
      addLog('No existing novel found — creating a new one…')
      const { data: created, error: createErr } = await supabase
        .from('novels')
        .insert({
          title: title.trim(),
          slug,
          author_id: user.id,
          tagline: tagline.trim() || null,
          status,
          published_chapters: 0,
          cover_bg: '#0a1525',
          cover_ink: '#e8e4dc',
          cover_accent: '#8fa3b1',
          cover_layout: 'banded',
        })
        .select('id')
        .maybeSingle()

      if (createErr || !created) {
        addLog(`❌ Could not create novel: ${createErr?.message ?? 'unknown error'}`)
        setStep('error'); return
      }
      novelId = (created as { id: string }).id
      addLog('Novel created.')
    }

    // 2. Wipe existing chapters
    addLog('Clearing existing chapters…')
    await supabase.from('chapters').delete().eq('novel_id', novelId)

    // 3. Insert chapters one by one
    const now = new Date().toISOString()
    let failed = 0
    for (const ch of parsed) {
      addLog(`Uploading chapter ${ch.number} of ${parsed.length}…`)
      const html = toHtml(ch.raw)
      const wc = wordCount(ch.raw)
      const { error: insErr } = await supabase.from('chapters').insert({
        novel_id: novelId,
        number: ch.number,
        title: `Chapter ${ch.number}`,
        content: html,
        word_count: wc,
        published_at: now,
        created_at: now,
        updated_at: now,
      })
      if (insErr) { addLog(`  ⚠ Ch ${ch.number} failed: ${insErr.message}`); failed++ }
    }

    // 4. Update novel metadata
    await supabase.from('novels').update({
      published_chapters: parsed.length - failed,
      status,
      tagline: tagline.trim() || null,
      updated_at: now,
    }).eq('id', novelId)

    addLog(`✓ Done — ${parsed.length - failed} chapters uploaded.`)
    setDoneSlug(slug)
    setStep('done')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink-faint)', fontSize: 14 }}>Checking auth…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(40px,6vw,80px) var(--page-pad)' }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 12px' }}>
          Admin
        </p>
        <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px,4vw,40px)', margin: 0, color: 'var(--ink)' }}>
          Novel Upload
        </h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', margin: '10px 0 0' }}>
          Paste the full text of a novel. Chapters are detected automatically by their number markers.
        </p>
      </div>

      {/* ── STEP: INPUT ── */}
      {step === 'input' && (
        <div>
          <Field label="Novel title" required>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="The Boy and the Sea"
              style={inputStyle}
            />
          </Field>

          <Field label="Tagline" hint="Optional — shown on the cover page">
            <input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="Some loves are not meant to last."
              style={inputStyle}
            />
          </Field>

          <Field label="Status">
            <div style={{ display: 'flex', gap: 12 }}>
              {(['complete', 'serial'] as const).map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: status === s ? 'var(--ink)' : 'var(--ink-mute)' }}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    style={{ accentColor: 'var(--ink)' }}
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="Full novel text"
            hint={`Paste the entire novel. Each chapter must begin with its number alone on a line:\n\n1\nChapter one content...\n\n2\nChapter two content...`}
            required
          >
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"1\nThe first men who saw the woman thought she was silk...\n\n2\nOn the second day, the boy's betrothed came..."}
              rows={18}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--mono)', fontSize: 13 }}
            />
          </Field>

          {parseError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: '#b91c1c', margin: 0, whiteSpace: 'pre-wrap' }}>{parseError}</p>
            </div>
          )}

          <button onClick={handleParse} className="btn-ink" style={{ fontSize: 14, padding: '10px 28px' }}>
            Parse chapters →
          </button>
        </div>
      )}

      {/* ── STEP: PREVIEW ── */}
      {step === 'preview' && (
        <div>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '14px 18px', marginBottom: 32 }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: '#166534', margin: 0 }}>
              ✓ Detected <strong>{parsed.length} chapters</strong> in <strong>"{title}"</strong>
              {' — '}{parsed.reduce((s, c) => s + wordCount(c.raw), 0).toLocaleString()} words total
            </p>
          </div>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ background: 'var(--paper-deep)', padding: '10px 18px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 24 }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', flex: '0 0 60px' }}>#</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', flex: 1 }}>Preview</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', flex: '0 0 60px', textAlign: 'right' }}>Words</span>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {parsed.map(ch => (
                <div key={ch.number} style={{ display: 'flex', gap: 24, padding: '12px 18px', borderBottom: '1px solid var(--rule)', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', flex: '0 0 60px', paddingTop: 2 }}>
                    {String(ch.number).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink)', flex: 1, lineHeight: 1.5 }}>
                    {ch.raw.slice(0, 120).replace(/\n/g, ' ')}{ch.raw.length > 120 ? '…' : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', flex: '0 0 60px', textAlign: 'right', paddingTop: 2 }}>
                    {wordCount(ch.raw).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep('input')} className="btn-ghost" style={{ fontSize: 13 }}>
              ← Back
            </button>
            <button onClick={handleUpload} className="btn-ink" style={{ fontSize: 14, padding: '10px 28px' }}>
              Upload {parsed.length} chapters
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: UPLOADING ── */}
      {step === 'uploading' && (
        <div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 16px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Upload log</p>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', lineHeight: 2 }}>
              {log.map((line, i) => (
                <div key={i} style={{ color: line.startsWith('❌') ? '#b91c1c' : line.startsWith('⚠') ? '#92400e' : line.startsWith('✓') ? '#166534' : 'var(--ink)' }}>
                  {line}
                </div>
              ))}
              {log.length === 0 && <span style={{ color: 'var(--ink-faint)' }}>Starting…</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 18, height: 18, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)' }}>Uploading…</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── STEP: DONE ── */}
      {step === 'done' && (
        <div>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '20px 24px', marginBottom: 32 }}>
            <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 22, color: '#166534', margin: '0 0 6px' }}>
              All done.
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: '#166534', margin: 0 }}>
              {parsed.length} chapters uploaded and published.
            </p>
          </div>

          <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 20, marginBottom: 32, background: 'var(--paper-deep)' }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Log</p>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.9 }}>
              {log.map((line, i) => (
                <div key={i} style={{ color: line.startsWith('❌') ? '#b91c1c' : line.startsWith('⚠') ? '#92400e' : line.startsWith('✓') ? '#166534' : 'var(--ink-mute)' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href={`/read/${doneSlug}`} className="btn-ink" style={{ fontSize: 13 }}>
              Read it →
            </Link>
            <Link href={`/book/${doneSlug}`} className="btn-ghost" style={{ fontSize: 13 }}>
              Book page
            </Link>
            <button
              onClick={() => { setStep('input'); setTitle(''); setTagline(''); setText(''); setParsed([]); setLog([]); setDoneSlug('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', padding: '8px 0' }}
            >
              Upload another novel
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: ERROR ── */}
      {step === 'error' && (
        <div>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: '#b91c1c', margin: 0 }}>
              Upload failed. Check the log below.
            </p>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.9, marginBottom: 24 }}>
            {log.map((line, i) => <div key={i}>{line}</div>)}
          </div>
          <button onClick={() => setStep('preview')} className="btn-ghost" style={{ fontSize: 13 }}>
            ← Try again
          </button>
        </div>
      )}

    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6,
  fontFamily: 'var(--sans)',
  fontSize: 14,
  color: 'var(--ink)',
  background: 'var(--paper)',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({ label, hint, required, children }: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink)', marginBottom: 8 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </label>
      {hint && (
        <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 8px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

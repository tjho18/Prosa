'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BookCover from './BookCover'
import Link from 'next/link'

interface Hit {
  id: string
  slug: string
  title: string
  tagline: string | null
  cover_bg: string
  cover_ink: string
  cover_accent: string
  cover_layout: string
  cover_image_url: string | null
  published_chapters: number
  status: string
  profiles: { username: string; display_name: string | null }
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setHits([])
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setHits([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('novels')
      .select('id, slug, title, tagline, cover_bg, cover_ink, cover_accent, cover_layout, cover_image_url, published_chapters, status, profiles(username, display_name)')
      .neq('status', 'draft')
      .ilike('title', `%${q.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(12)
    setHits((data ?? []) as unknown as Hit[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const id = setTimeout(() => search(query), 220)
    return () => clearTimeout(id)
  }, [query, search])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(60px,10vh,120px) var(--page-pad) 0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600,
          background: 'var(--paper)',
          borderRadius: 12,
          boxShadow: '0 8px 48px rgba(0,0,0,0.20)',
          overflow: 'hidden',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', borderBottom: '1px solid var(--rule)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ color: 'var(--ink-mute)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search novels…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--ink)',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: 0, display: 'flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!query.trim() ? (
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', padding: '20px', textAlign: 'center' }}>
              Type to search novels
            </p>
          ) : loading ? (
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', padding: '20px', textAlign: 'center' }}>
              Searching…
            </p>
          ) : hits.length === 0 ? (
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', padding: '20px', textAlign: 'center' }}>
              No novels found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            hits.map(hit => {
              const author = hit.profiles.display_name ?? hit.profiles.username
              return (
                <Link
                  key={hit.id}
                  href={`/book/${hit.slug}`}
                  onClick={onClose}
                  style={{
                    display: 'flex', gap: 14, padding: '12px 20px', textDecoration: 'none', color: 'inherit',
                    borderBottom: '1px solid var(--rule)', alignItems: 'center',
                  }}
                >
                  <BookCover
                    title={hit.title} author={author}
                    bg={hit.cover_bg} ink={hit.cover_ink} accent={hit.cover_accent}
                    layout={hit.cover_layout as 'banded'} imageUrl={hit.cover_image_url ?? undefined}
                    w={36} h={54}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 16, margin: '0 0 2px', lineHeight: 1.2, color: 'var(--ink)' }}>
                      {hit.title}
                    </p>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-mute)', margin: 0 }}>
                      {author} · {hit.published_chapters} ch · {hit.status}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

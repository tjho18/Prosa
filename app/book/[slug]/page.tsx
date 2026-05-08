import { createClient } from '@/lib/supabase/server'
import type { NovelWithAuthor, Chapter } from '@/lib/types'
import BookCover from '@/components/BookCover'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('novels').select('title, tagline').eq('slug', slug).single()
  if (!data) return { title: 'Novel not found' }
  const d = data as { title: string; tagline: string | null }
  return { title: d.title, description: d.tagline ?? undefined }
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: novel } = await supabase
    .from('novels').select('*, profiles(*)')
    .eq('slug', slug).neq('status', 'draft').single()

  if (!novel) notFound()

  const n = novel as unknown as NovelWithAuthor & {
    cover_layout: string; cover_image_url: string | null; description: string; tags: string[]
  }

  const { data: chaptersRaw } = await supabase
    .from('chapters').select('id, number, title, word_count, published_at')
    .eq('novel_id', n.id).not('published_at', 'is', null)
    .order('number', { ascending: true })

  const chapters = (chaptersRaw ?? []) as Pick<Chapter, 'id' | 'number' | 'title' | 'word_count' | 'published_at'>[]
  const totalWords = chapters.reduce((s, c) => s + (c.word_count ?? 0), 0)
  const readingHours = Math.round(totalWords / 20000 * 10) / 10
  const author = n.profiles.display_name ?? n.profiles.username

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>

      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(52px,7vw,96px) var(--page-pad) clamp(44px,5vw,68px)' }}>
        <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', display: 'flex', gap: 'clamp(32px,5vw,80px)', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Cover */}
          <Link href={`/read/${n.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <BookCover
              title={n.title} author={author}
              bg={n.cover_bg} ink={n.cover_ink} accent={n.cover_accent}
              layout={n.cover_layout as 'banded'} imageUrl={n.cover_image_url ?? undefined}
              w={200} h={300}
            />
          </Link>

          {/* Meta */}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* Status */}
            <p style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 20px' }}>
              {n.status === 'serial' ? 'Serial in progress' : 'Complete novel'}
            </p>

            <h1 style={{
              fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500,
              fontSize: 'clamp(30px,4vw,52px)', lineHeight: 1.06,
              margin: '0 0 10px', color: 'var(--ink)', letterSpacing: '-0.01em',
            }}>
              {n.title}
            </h1>

            {/* Em-dash attribution — Poema style */}
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-mute)', margin: '0 0 28px' }}>
              <Link href={`/profile/${n.profiles.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                — {author}
              </Link>
            </p>

            {n.tagline && (
              <p style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 20px', maxWidth: 480 }}>
                {n.tagline}
              </p>
            )}

            {n.description && (
              <p style={{ fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.75, color: 'var(--ink-mute)', margin: '0 0 28px', maxWidth: 480 }}>
                {n.description}
              </p>
            )}

            {/* Stats */}
            {(totalWords > 0 || chapters.length > 0) && (
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>
                <Stat label="Chapters" value={String(chapters.length)} />
                {totalWords > 0 && <Stat label="Words" value={totalWords.toLocaleString()} />}
                {readingHours > 0 && <Stat label="Read time" value={`~${readingHours}h`} />}
              </div>
            )}

            {/* Tags */}
            {n.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
                {n.tags.map((t: string) => (
                  <span key={t} style={{
                    fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.04em',
                    padding: '3px 10px', borderRadius: 999,
                    background: 'var(--paper-deep)', color: 'var(--ink-mute)',
                  }}>{t}</span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {chapters.length > 0 && (
                <Link href={`/read/${n.slug}`} className="btn-ink" style={{ fontSize: 13 }}>Begin reading</Link>
              )}
              {n.status === 'serial' && chapters.length > 1 && (
                <Link href={`/read/${n.slug}?ch=${chapters[chapters.length - 1].number}`} className="btn-ghost" style={{ fontSize: 13 }}>
                  Latest chapter
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Table of contents ────────────────────────── */}
      {chapters.length > 0 && (
        <section style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', padding: 'clamp(44px,5vw,68px) var(--page-pad)' }}>
          <div style={{ maxWidth: 680 }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 20px' }}>
              Contents
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {chapters.map(ch => (
                <li key={ch.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                  <Link
                    href={`/read/${n.slug}?ch=${ch.number}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'baseline', gap: 16, padding: '15px 0' }}
                  >
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em', minWidth: 28 }}>
                      {String(ch.number).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 19, flex: 1, color: 'var(--ink)' }}>
                      {ch.title}
                    </span>
                    {ch.word_count > 0 && (
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.02em' }}>
                        {ch.word_count.toLocaleString()} w
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 5px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 24, margin: 0, color: 'var(--ink)', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

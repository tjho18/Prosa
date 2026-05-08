import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Novel } from '@/lib/types'
import BookCover from '@/components/BookCover'
import Link from 'next/link'
import NewNovelButton from './NewNovelButton'

export const metadata = { title: 'Write — Prosa' }

export default async function WritePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: novels } = await supabase
    .from('novels')
    .select('*')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false })

  const ns = (novels ?? []) as (Novel & { cover_image_url?: string | null })[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* ── Header ────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(40px,6vw,72px) var(--page-pad) clamp(24px,3vw,36px)' }}>
        <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 10px' }}>
              Your work
            </p>
            <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px,3.5vw,42px)', margin: 0, lineHeight: 1.1, color: 'var(--ink)' }}>
              Writing desk
            </h1>
          </div>
          <NewNovelButton />
        </div>
      </div>

      {/* ── Novels ────────────────────────────────── */}
      <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', padding: 'clamp(32px,4vw,56px) var(--page-pad)' }}>
        {ns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 26, color: 'var(--ink-mute)', margin: '0 0 28px', lineHeight: 1.4 }}>
              The page is blank. Begin.
            </p>
            <NewNovelButton primary />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '48px 28px' }}>
            {ns.map(n => (
              <Link key={n.id} href={`/write/${n.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <BookCover
                  title={n.title}
                  author=""
                  bg={n.cover_bg} ink={n.cover_ink} accent={n.cover_accent}
                  layout={n.cover_layout as 'banded'}
                  imageUrl={n.cover_image_url ?? undefined}
                  w={190} h={285}
                />
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 18, margin: '0 0 8px', lineHeight: 1.15, color: 'var(--ink)' }}>
                    {n.title}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="tag" style={{ fontSize: 11 }}>{n.status}</span>
                    <span className="tag" style={{ fontSize: 11 }}>{n.published_chapters} / {n.total_chapters} ch</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

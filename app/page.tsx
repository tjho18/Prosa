import { createClient } from '@/lib/supabase/server'
import type { NovelWithAuthor } from '@/lib/types'
import BookCover from '@/components/BookCover'
import Link from 'next/link'

export const revalidate = 60

type DisplayNovel = NovelWithAuthor & { cover_layout: string; cover_image_url?: string | null }

type Tab = 'all' | 'serial' | 'complete' | 'following'
const TABS: { label: string; value: Tab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Serials', value: 'serial' },
  { label: 'Complete', value: 'complete' },
]

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const activeTab: Tab = tab === 'serial' || tab === 'complete' || tab === 'following' ? tab : 'all'

  const supabase = await createClient()

  // Featured novel: most recently updated novel with at least one published chapter
  // (no status filter — the hero always shows the author's work)
  const { data: featuredRaw } = await supabase
    .from('novels').select('*, profiles(*)')
    .gt('published_chapters', 0)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  const featured = featuredRaw as unknown as DisplayNovel | null

  // Grid novels
  let all: DisplayNovel[] = []
  if (activeTab === 'following') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: followed } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)
      const ids = (followed ?? []).map((f: { following_id: string }) => f.following_id)
      if (ids.length > 0) {
        const { data } = await supabase
          .from('novels').select('*, profiles(*)')
          .neq('status', 'draft').in('author_id', ids)
          .order('updated_at', { ascending: false }).limit(60)
        all = (data ?? []) as unknown as DisplayNovel[]
      }
    }
  } else {
    let query = supabase.from('novels').select('*, profiles(*)').gt('published_chapters', 0)
    if (activeTab !== 'all') query = query.eq('status', activeTab)
    const { data } = await query.order('created_at', { ascending: false }).limit(60)
    all = (data ?? []) as unknown as DisplayNovel[]
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>

      {/* ── Featured novel (Poema "poem of the day" equivalent) ── */}
      {featured ? (
        <FeaturedNovel novel={featured} />
      ) : (
        <div style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(72px,10vw,120px) var(--page-pad)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 20px' }}>
            Welcome to Prosa
          </p>
          <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(36px,5vw,64px)', margin: '0 0 20px', lineHeight: 1.05 }}>
            A home for novels.
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-mute)', margin: '0 0 36px' }}>
            Publish your novel — chapter by chapter, like Dickens.
          </p>
          <Link href="/write" className="btn-green">Start writing</Link>
        </div>
      )}

      {/* ── Browse section ──────────────────────────────────── */}
      <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', padding: '0 var(--page-pad)' }}>

        {/* Section header + tabs */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 'clamp(40px,5vw,64px)' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: 0 }}>
            On the shelf
          </p>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(({ label, value }) => {
              const active = value === activeTab
              const href = value === 'all' ? '/' : `/?tab=${value}`
              return (
                <Link key={value} href={href} style={{
                  padding: '6px 16px', textDecoration: 'none',
                  fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.04em',
                  color: active ? 'var(--ink)' : 'var(--ink-faint)',
                  borderBottom: active ? '1px solid var(--ink)' : '1px solid transparent',
                }}>{label}</Link>
              )
            })}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--rule)', margin: '16px 0 clamp(32px,4vw,52px)' }} />

        {/* Grid */}
        {all.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'clamp(60px,10vw,100px) 0' }}>
            <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink-mute)', margin: '0 0 6px' }}>
              {activeTab === 'following' ? 'No novels from authors you follow yet.' : 'The shelf is empty.'}
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 28px' }}>
              {activeTab === 'following'
                ? 'Follow authors on their profile pages to see their work here.'
                : 'Be the first to publish.'}
            </p>
            {activeTab !== 'following' && <Link href="/write" className="btn-ghost" style={{ fontSize: 13 }}>Go to your writing desk →</Link>}
          </div>
        ) : (
          <div className="shelf-grid">
            {all.map(novel => <NovelTile key={novel.id} novel={novel} />)}
          </div>
        )}

        <div style={{ height: 'clamp(64px,8vw,96px)' }} />
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--rule)',
        padding: '20px var(--page-pad)',
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
        fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.04em', color: 'var(--ink-faint)',
        maxWidth: 'var(--wide-width)', margin: '0 auto',
      }}>
        <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)' }}>Prosa</span>
        <Link href="/write" style={{ textDecoration: 'none', color: 'var(--ink-faint)' }}>Write</Link>
        <span style={{ marginLeft: 'auto' }}>est. mmxxvi</span>
      </footer>

      <style>{`
        .shelf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
          gap: clamp(40px, 5vw, 60px) clamp(20px, 3vw, 32px);
        }
        @media (max-width: 480px) {
          .shelf-grid { grid-template-columns: repeat(2, 1fr); gap: 32px 16px; }
        }
      `}</style>
    </div>
  )
}

/* ── Featured novel hero ─────────────────────────────────────────── */
function FeaturedNovel({ novel }: { novel: DisplayNovel }) {
  const author = novel.profiles.display_name ?? novel.profiles.username

  return (
    <>
      {/* Desktop */}
      <div className="featured-desktop" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div style={{
          maxWidth: 'var(--wide-width)', margin: '0 auto',
          padding: 'clamp(52px,7vw,88px) var(--page-pad)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 'clamp(40px,6vw,88px)',
          alignItems: 'center',
        }}>
          {/* Text column */}
          <div style={{ maxWidth: 560 }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 11,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--ink-faint)', margin: '0 0 28px',
            }}>
              Now on the shelf
            </p>

            <Link href={`/book/${novel.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <h1 style={{
                fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500,
                fontSize: 'clamp(36px,4.5vw,60px)', lineHeight: 1.04,
                color: 'var(--ink)', margin: '0 0 16px',
                letterSpacing: '-0.01em',
              }}>
                {novel.title}
              </h1>
            </Link>

            <p style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 16, color: 'var(--ink-mute)', margin: '0 0 6px',
              letterSpacing: '0.01em',
            }}>
              <Link href={`/profile/${novel.profiles.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                — {author}
              </Link>
            </p>

            {novel.tagline && (
              <p style={{
                fontFamily: 'var(--serif)', fontSize: 18,
                lineHeight: 1.65, color: 'var(--ink)',
                margin: '24px 0 32px', maxWidth: 460,
              }}>
                {novel.tagline}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: novel.tagline ? 0 : 32, flexWrap: 'wrap' }}>
              <Link href={`/read/${novel.slug}`} className="btn-ink" style={{ fontSize: 13 }}>
                Begin reading
              </Link>
              <Link href={`/book/${novel.slug}`} style={{
                fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)',
                textDecoration: 'none', letterSpacing: '0.02em',
              }}>
                About this novel →
              </Link>
            </div>
          </div>

          {/* Cover */}
          <Link href={`/book/${novel.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <BookCover
              title={novel.title} author={author}
              bg={novel.cover_bg} ink={novel.cover_ink} accent={novel.cover_accent}
              layout={novel.cover_layout as 'banded'}
              imageUrl={novel.cover_image_url ?? undefined}
              w={160} h={240}
            />
          </Link>
        </div>
      </div>

      {/* Mobile */}
      <div className="featured-mobile" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div style={{ padding: 'clamp(36px,8vw,56px) var(--page-pad) 0' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 20px' }}>
            Now on the shelf
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <Link href={`/book/${novel.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <BookCover
                title={novel.title} author={author}
                bg={novel.cover_bg} ink={novel.cover_ink} accent={novel.cover_accent}
                layout={novel.cover_layout as 'banded'}
                imageUrl={novel.cover_image_url ?? undefined}
                w={88} h={132}
              />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={`/book/${novel.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(24px,6vw,32px)', lineHeight: 1.1, margin: '0 0 6px' }}>
                  {novel.title}
                </h1>
              </Link>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-mute)', margin: '0 0 14px' }}>
                — {author}
              </p>
              <Link href={`/read/${novel.slug}`} className="btn-ink" style={{ fontSize: 12, padding: '7px 16px' }}>
                Begin reading
              </Link>
            </div>
          </div>
          {novel.tagline && (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)', margin: '20px 0 0', paddingBottom: 'clamp(28px,5vw,40px)' }}>
              {novel.tagline}
            </p>
          )}
          {!novel.tagline && <div style={{ height: 'clamp(28px,5vw,40px)' }} />}
        </div>
      </div>

      <style>{`
        .featured-mobile { display: none; }
        @media (max-width: 640px) {
          .featured-desktop { display: none !important; }
          .featured-mobile { display: block; }
        }
      `}</style>
    </>
  )
}

/* ── Grid tile ───────────────────────────────────────────────────── */
function NovelTile({ novel }: { novel: DisplayNovel }) {
  const author = novel.profiles.display_name ?? novel.profiles.username
  return (
    <Link href={`/book/${novel.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
      <BookCover
        title={novel.title} author={author}
        bg={novel.cover_bg} ink={novel.cover_ink} accent={novel.cover_accent}
        layout={novel.cover_layout as 'banded'}
        imageUrl={novel.cover_image_url ?? undefined}
        w={168} h={252}
      />
      <div style={{ marginTop: 14 }}>
        <p style={{
          fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500,
          fontSize: 16, lineHeight: 1.2, margin: '0 0 3px', color: 'var(--ink)',
        }}>
          {novel.title}
        </p>
        <p style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 12, color: 'var(--ink-mute)', margin: '0 0 8px',
        }}>
          — {author}
        </p>
        {novel.tagline && (
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-mute)',
            margin: '0 0 10px', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {novel.tagline}
          </p>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
            background: novel.status === 'serial' ? '#fef3c7' : 'var(--paper-deep)',
            color: novel.status === 'serial' ? '#92400e' : 'var(--ink-faint)',
          }}>
            {novel.status}
          </span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)' }}>
            {novel.published_chapters} ch
          </span>
        </div>
      </div>
    </Link>
  )
}

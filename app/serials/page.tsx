import { createClient } from '@/lib/supabase/server'
import type { NovelWithAuthor } from '@/lib/types'
import BookCover from '@/components/BookCover'
import Link from 'next/link'

export const revalidate = 60
export const metadata = { title: 'Serials' }

const SEED = [
  { id: 's4', slug: 'midwinter-sentence', title: 'Midwinter Sentence', tagline: 'Six chapters. The seventh, on Thursday.', cover_bg: '#1f1a14', cover_ink: '#ebe4d4', cover_accent: '#8a3a2a', cover_layout: 'minimal', status: 'serial', profiles: { id: 'p4', username: 'jian_pak', display_name: 'Jian Pak', bio: null, avatar_url: null, created_at: '' }, published_chapters: 6, tags: ['serial', 'urban'], total_chapters: 12, author_id: 'p4', description: null, created_at: '', updated_at: '' },
]

export default async function SerialsPage() {
  const supabase = await createClient()
  const { data: novels } = await supabase.from('novels').select('*, profiles(*)').eq('status', 'serial').order('updated_at', { ascending: false })
  const ns = (novels && novels.length > 0 ? novels : SEED) as unknown as (NovelWithAuthor & { cover_layout: string; cover_image_url?: string })[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(40px,6vw,72px) var(--page-pad) clamp(28px,4vw,48px)' }}>
        <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 12px' }}>Ongoing</p>
          <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(32px,4vw,52px)', margin: '0 0 10px', lineHeight: 1.05 }}>
            Serials in Progress
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--ink-mute)', margin: 0 }}>
            A chapter every Thursday — like Dickens.
          </p>
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', padding: '0 var(--page-pad)' }}>
        {ns.length === 0 ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-mute)', fontSize: 18, padding: '48px 0' }}>No active serials yet.</p>
        ) : ns.map(n => {
          const author = n.profiles.display_name ?? n.profiles.username
          return (
            <article key={n.id} style={{ padding: 'clamp(28px,4vw,48px) 0', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 'clamp(20px,4vw,48px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Link href={`/book/${n.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <BookCover title={n.title} author={author} bg={n.cover_bg} ink={n.cover_ink} accent={n.cover_accent}
                  layout={n.cover_layout as 'banded'} imageUrl={n.cover_image_url} w={130} h={194} />
              </Link>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-mute)', margin: '0 0 8px' }}>
                  <Link href={`/profile/${n.profiles.username}`} style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}>{author}</Link>
                  {' '}· serial · {n.published_chapters} chapters published
                </p>
                <Link href={`/book/${n.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h2 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.1, margin: '0 0 10px' }}>{n.title}</h2>
                </Link>
                {n.tagline && (
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--ink-mute)', margin: '0 0 20px', lineHeight: 1.55, maxWidth: 520 }}>{n.tagline}</p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link href={`/read/${n.slug}`} className="btn-green" style={{ fontSize: 13 }}>Read · ch. 1</Link>
                  <Link href={`/book/${n.slug}`} className="btn-ghost" style={{ fontSize: 13 }}>Contents</Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

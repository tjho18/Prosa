import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { NovelWithAuthor } from '@/lib/types'
import BookCover from '@/components/BookCover'
import Link from 'next/link'
import FollowButton from './FollowButton'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('display_name').eq('username', username).single()
  if (!data) return { title: 'Author not found' }
  const d = data as unknown as { display_name: string | null }
  return { title: (d.display_name ?? username) + ' — Prosa' }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [novelsResult, { data: { user } }, followersResult] = await Promise.all([
    supabase.from('novels').select('*, profiles(*)')
      .eq('author_id', profile.id).neq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profile.id),
  ])

  const ns = (novelsResult.data ?? []) as unknown as (NovelWithAuthor & { cover_layout: string; cover_image_url?: string | null })[]
  const isOwn = user?.id === profile.id
  const followerCount = followersResult.count ?? 0

  // Check if current user follows this profile
  let isFollowing = false
  if (user && !isOwn) {
    const { data: f } = await supabase.from('follows')
      .select('follower_id').eq('follower_id', user.id).eq('following_id', profile.id).single()
    isFollowing = !!f
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* ── Profile header ─────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--rule)', padding: 'clamp(48px,7vw,96px) var(--page-pad) clamp(32px,4vw,52px)' }}>
        <div style={{ maxWidth: 'var(--wide-width)', margin: '0 auto' }}>
          <div style={{ maxWidth: 640 }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--paper-deep)', border: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 32, color: 'var(--ink-mute)',
            }}>
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </div>

            <h1 style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 'clamp(24px,3vw,36px)', margin: '0 0 6px', color: 'var(--ink)', lineHeight: 1.1 }}>
              {profile.display_name ?? profile.username}
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-mute)', margin: '0 0 16px' }}>
              @{profile.username}
            </p>

            {profile.bio && (
              <p style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.65, color: 'var(--ink)', maxWidth: 520, margin: '0 0 20px' }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-mute)' }}>
                {ns.length} {ns.length === 1 ? 'novel' : 'novels'}
              </span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-mute)' }}>
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </span>
              {isOwn ? (
                <Link href="/profile" className="btn-ghost" style={{ fontSize: 13, padding: '6px 16px' }}>
                  Edit profile
                </Link>
              ) : (
                <FollowButton targetId={profile.id} initialFollowing={isFollowing} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Novels ──────────────────────────────────── */}
      <section style={{ maxWidth: 'var(--wide-width)', margin: '0 auto', padding: 'clamp(32px,4vw,56px) var(--page-pad)' }}>
        {ns.length === 0 ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink-mute)', textAlign: 'center', padding: '60px 0' }}>
            No published novels yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '48px 28px' }}>
            {ns.map(n => (
              <Link key={n.id} href={`/book/${n.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <BookCover
                  title={n.title}
                  author={n.profiles.display_name ?? n.profiles.username}
                  bg={n.cover_bg} ink={n.cover_ink} accent={n.cover_accent}
                  layout={n.cover_layout as 'banded'}
                  imageUrl={n.cover_image_url ?? undefined}
                  w={160} h={240}
                />
                <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 17, margin: '12px 0 6px', lineHeight: 1.15, color: 'var(--ink)' }}>
                  {n.title}
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="tag" style={{ fontSize: 11 }}>{n.published_chapters} ch</span>
                  <span className="tag" style={{ fontSize: 11 }}>{n.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

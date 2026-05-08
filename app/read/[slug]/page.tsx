import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Reader from './Reader'

export const revalidate = 60

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ch?: string }>
}) {
  const { slug } = await params
  const { ch } = await searchParams
  const supabase = await createClient()
  const { data: novel } = await supabase.from('novels').select('title').eq('slug', slug).single()
  if (!novel) return { title: 'Not found' }
  return { title: ch ? `Ch. ${ch} · ${novel.title}` : novel.title }
}

export default async function ReadPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ch?: string }>
}) {
  const { slug } = await params
  const { ch } = await searchParams

  const supabase = await createClient()

  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, slug, cover_bg, cover_ink, cover_accent, cover_layout, status, profiles(username, display_name)')
    .eq('slug', slug)
    .neq('status', 'draft')
    .single()

  if (!novel) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, number, title, content, word_count, published_at')
    .eq('novel_id', novel.id)
    .not('published_at', 'is', null)
    .order('number', { ascending: true })

  if (!chapters || chapters.length === 0) notFound()

  // Resolve starting chapter: explicit param → saved progress → chapter 1
  let chapterNum = ch ? parseInt(ch) : null
  if (!chapterNum) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: progress } = await supabase
        .from('reading_progress')
        .select('chapter_number')
        .eq('user_id', user.id)
        .eq('novel_id', novel.id)
        .single()
      if (progress) chapterNum = progress.chapter_number
    }
  }

  const chapter = chapters.find(c => c.number === chapterNum) ?? chapters[0]

  return <Reader novel={novel as any} chapters={chapters as any} initialChapter={chapter as any} />
}

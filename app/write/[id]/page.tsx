import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Novel, Chapter } from '@/lib/types'
import NovelEditor from './NovelEditor'

export const metadata = { title: 'Edit novel' }

export default async function EditNovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: novel } = await supabase
    .from('novels')
    .select('*')
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (!novel) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', id)
    .order('number', { ascending: true })

  return <NovelEditor novel={novel as Novel} chapters={(chapters ?? []) as Chapter[]} />
}

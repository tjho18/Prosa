'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewNovelButton({ primary }: { primary?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function create() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signin'); return }

    const slug = `untitled-${Date.now()}`
    const { data, error } = await supabase
      .from('novels')
      .insert({
        author_id: user.id,
        slug,
        title: 'Untitled novel',
        status: 'draft',
      })
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/write/${data.id}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className={primary ? 'btn-ink' : 'btn-ghost'}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading ? 'Creating…' : 'New novel'}
    </button>
  )
}

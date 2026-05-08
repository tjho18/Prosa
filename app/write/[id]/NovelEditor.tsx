'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BookCover from '@/components/BookCover'
import Link from 'next/link'
import type { Novel, Chapter } from '@/lib/types'
import ChapterEditor from './ChapterEditor'

const LAYOUTS = ['banded', 'rule', 'centered', 'minimal'] as const
const STATUSES = ['draft', 'serial', 'complete'] as const

const PALETTES = [
  { bg: '#2a3a2a', ink: '#ebe4d4', accent: '#8a3a2a' },
  { bg: '#1f1a14', ink: '#ebe4d4', accent: '#8a3a2a' },
  { bg: '#ebe4d4', ink: '#2a3a2a', accent: '#8a3a2a' },
  { bg: '#3d4a3a', ink: '#ebe4d4', accent: '#a89c7a' },
  { bg: '#2a2a3a', ink: '#e4e0eb', accent: '#5a3a8a' },
  { bg: '#3a2a2a', ink: '#ebe4d4', accent: '#c07a3a' },
  { bg: '#0f1923', ink: '#e8e4dc', accent: '#4a7c9a' },
  { bg: '#ffffff', ink: '#1a1a1a', accent: '#1a8917' },
]

interface NovelFull extends Omit<Novel, 'cover_image_url'> { cover_image_url?: string | null }
interface Props { novel: NovelFull; chapters: Chapter[] }

export default function NovelEditor({ novel: initialNovel, chapters: initialChapters }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [novel, setNovel] = useState(initialNovel)
  const [chapters, setChapters] = useState(initialChapters)
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null)
  const [tab, setTab] = useState<'chapters' | 'settings'>('chapters')
  const [saved, setSaved] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function showSaved(msg = 'Saved') {
    setSaved(msg)
    setTimeout(() => setSaved(null), 2000)
  }

  const saveNovel = useCallback(async (updates: Partial<NovelFull>) => {
    const merged = { ...novel, ...updates }
    setNovel(merged)
    await supabase.from('novels').update(updates as Record<string, unknown>).eq('id', novel.id)
    showSaved()
  }, [novel, supabase])

  const newChapter = async () => {
    const number = (chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) : 0) + 1
    const { data } = await supabase
      .from('chapters')
      .insert({ novel_id: novel.id, number, title: `Chapter ${number}`, content: '' })
      .select('*')
      .single()
    if (data) {
      const ch = data as Chapter
      setChapters(cs => [...cs, ch])
      setActiveChapter(ch)
    }
  }

  const deleteNovel = async () => {
    if (!confirm('Delete this novel permanently? This cannot be undone.')) return
    await supabase.from('novels').delete().eq('id', novel.id)
    router.push('/write')
  }

  const uploadCoverImage = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${novel.id}/cover.${ext}`
      const { error } = await supabase.storage
        .from('covers')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) { alert('Upload failed: ' + error.message); return }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      const publicUrl = urlData.publicUrl + '?t=' + Date.now()
      await saveNovel({ cover_image_url: publicUrl })
    } finally {
      setUploading(false)
    }
  }

  const removeCoverImage = async () => { await saveNovel({ cover_image_url: null }) }

  // ── Chapter editor ───────────────────────────────
  if (activeChapter) {
    return (
      <ChapterEditor
        novel={{ id: novel.id, slug: novel.slug, title: novel.title }}
        chapter={activeChapter}
        onBack={() => setActiveChapter(null)}
        onSaved={showSaved}
      />
    )
  }

  // ── Novel overview ───────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 57, zIndex: 50,
        background: 'var(--paper)', borderBottom: '1px solid var(--rule)',
        padding: '0 var(--page-pad)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <Link href="/write" style={{ ...monoBtn, textDecoration: 'none' }}>← Desk</Link>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['chapters', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...monoBtn,
              padding: '4px 14px',
              color: tab === t ? 'var(--ink)' : 'var(--ink-mute)',
              borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-mute)' }}>{saved}</span>}
          {novel.status !== 'draft' && (
            <Link href={`/book/${novel.slug}`} style={{ ...monoBtn, textDecoration: 'none' }}>View →</Link>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(32px,4vw,56px) var(--page-pad)' }}>

        {/* ── CHAPTERS TAB ── */}
        {tab === 'chapters' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 28, margin: 0, color: 'var(--ink)' }}>
                {novel.title}
              </h2>
              <button onClick={newChapter} className="btn-ink" style={{ fontSize: 13 }}>+ New chapter</button>
            </div>

            {/* Warn when chapters are live but the novel is still hidden as a draft */}
            {novel.status === 'draft' && chapters.some(c => c.published_at) && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
                padding: '12px 16px', marginBottom: 24, flexWrap: 'wrap',
              }}>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: '#92400e', margin: 0 }}>
                  ⚠ Chapters are live but this novel is still <strong>draft</strong> — it won&apos;t appear on the homepage.
                </p>
                <button
                  onClick={() => saveNovel({ status: 'complete' })}
                  style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Publish novel →
                </button>
              </div>
            )}

            {chapters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-mute)', margin: '0 0 24px' }}>
                  No chapters yet.
                </p>
                <button onClick={newChapter} className="btn-ghost">Write the first chapter</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {chapters.map(ch => (
                  <button key={ch.id} onClick={() => setActiveChapter(ch)} style={{
                    display: 'flex', alignItems: 'baseline', gap: 16, padding: '14px 0',
                    background: 'none', border: 'none', borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  } as React.CSSProperties}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', minWidth: 24 }}>
                      {String(ch.number).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 18, flex: 1, color: 'var(--ink)' }}>
                      {ch.title}
                    </span>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-mute)' }}>
                      {ch.word_count > 0 ? `${ch.word_count.toLocaleString()} w` : 'empty'}
                    </span>
                    <span className="tag" style={{ fontSize: 11, background: ch.published_at ? '#e8f5e9' : 'var(--paper-deep)', color: ch.published_at ? '#1a8917' : 'var(--ink-mute)' }}>
                      {ch.published_at ? 'live' : 'draft'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Cover */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <BookCover
                title={novel.title} author=""
                bg={novel.cover_bg} ink={novel.cover_ink} accent={novel.cover_accent}
                layout={novel.cover_layout as 'banded'}
                imageUrl={novel.cover_image_url ?? undefined}
                w={180} h={270}
              />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCoverImage(f); e.target.value = '' }}
              />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ fontFamily: 'var(--sans)', fontSize: 13, padding: '8px 16px', background: 'var(--paper-deep)', border: '1px solid var(--rule)', borderRadius: 6, cursor: uploading ? 'default' : 'pointer', color: 'var(--ink)', opacity: uploading ? 0.6 : 1, width: 180 }}>
                {uploading ? 'Uploading…' : novel.cover_image_url ? '↑ Replace image' : '↑ Upload cover image'}
              </button>
              {novel.cover_image_url && (
                <button onClick={removeCoverImage} style={{ fontFamily: 'var(--sans)', fontSize: 12, padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#9b2b2b', textAlign: 'center', width: 180 }}>
                  Remove image
                </button>
              )}
            </div>

            {/* Fields */}
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <SettingField label="Title" defaultValue={novel.title} onBlur={v => saveNovel({ title: v })} />
              <SettingField label="Tagline" defaultValue={novel.tagline ?? ''} multiline onBlur={v => saveNovel({ tagline: v || null })} />
              <SettingField label="Description" defaultValue={novel.description ?? ''} multiline onBlur={v => saveNovel({ description: v || null })} />
              <SettingField label="URL slug" defaultValue={novel.slug} onBlur={v => saveNovel({ slug: v })} />

              {/* Status */}
              <div>
                <Label>Status</Label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => saveNovel({ status: s })}
                      className={novel.status === s ? 'btn-ink' : 'btn-ghost'}
                      style={{ fontSize: 13, padding: '6px 18px' }}>
                      {s}
                    </button>
                  ))}
                </div>
                {novel.status === 'draft' && (
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: 6, marginTop: 10 }}>
                    ⚠ Draft novels are hidden from the homepage. Change to <strong>serial</strong> or <strong>complete</strong> to publish.
                  </p>
                )}
              </div>

              {/* Layout */}
              {!novel.cover_image_url && (
                <div>
                  <Label>Cover layout</Label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {LAYOUTS.map(l => (
                      <button key={l} onClick={() => saveNovel({ cover_layout: l })}
                        className={novel.cover_layout === l ? 'btn-ink' : 'btn-ghost'}
                        style={{ fontSize: 13, padding: '6px 18px' }}>{l}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Palette */}
              {!novel.cover_image_url && (
                <div>
                  <Label>Cover palette</Label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PALETTES.map(p => (
                      <button key={p.bg} onClick={() => saveNovel({ cover_bg: p.bg, cover_ink: p.ink, cover_accent: p.accent })}
                        style={{ width: 36, height: 52, background: p.bg, border: novel.cover_bg === p.bg ? `2px solid ${p.accent}` : '2px solid transparent', cursor: 'pointer', borderRadius: 2, flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
              )}

              <SettingField label="Tags (comma-separated)" defaultValue={(novel.tags ?? []).join(', ')}
                onBlur={v => saveNovel({ tags: v.split(',').map(t => t.trim()).filter(Boolean) })} />

              <div style={{ marginTop: 8, paddingTop: 24, borderTop: '1px solid var(--rule)' }}>
                <button onClick={deleteNovel} style={{ fontFamily: 'var(--sans)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#9b2b2b', padding: 0 }}>
                  Delete this novel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', margin: '0 0 10px' }}>
      {children}
    </p>
  )
}

function SettingField({ label, defaultValue, multiline, onBlur: onSave }: {
  label: string; defaultValue: string; multiline?: boolean; onBlur: (v: string) => void
}) {
  const [val, setVal] = useState(defaultValue)
  const Tag = multiline ? 'textarea' : 'input'
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    ;(e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--rule)'
    onSave(val)
  }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{label}</span>
      <Tag value={val}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVal(e.target.value)}
        onBlur={handleBlur}
        onFocus={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { ;(e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--ink)' }}
        rows={multiline ? 3 : undefined}
        style={{ fontFamily: 'var(--sans)', fontSize: 15, padding: '8px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--rule)', color: 'var(--ink)', outline: 'none', width: '100%', resize: multiline ? 'vertical' : 'none' }}
      />
    </label>
  )
}

const monoBtn: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: 13, background: 'none',
  border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: '2px 0',
}

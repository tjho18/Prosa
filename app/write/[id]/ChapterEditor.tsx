'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useRef, useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Chapter, Novel } from '@/lib/types'
import Link from 'next/link'

interface Props {
  novel: Pick<Novel, 'id' | 'slug' | 'title'>
  chapter: Chapter
  onBack: () => void
  onSaved: (msg?: string) => void
}

/** Convert plain-text (legacy) to HTML paragraphs */
function toHtml(content: string): string {
  if (!content) return ''
  if (content.includes('<p') || content.includes('<br') || content.startsWith('<')) return content
  return content
    .split(/\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('')
}

export default function ChapterEditor({ novel, chapter, onBack, onSaved }: Props) {
  const supabase = createClient()
  const titleRef = useRef(chapter.title)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imgUploadingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardUp, setKeyboardUp] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(chapter.published_at)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth <= 640)
    // Detect virtual keyboard on mobile via viewport height change
    const initialH = window.innerHeight
    function onResize() {
      setIsMobile(window.innerWidth <= 640)
      if (window.innerWidth <= 640) {
        setKeyboardUp(window.innerHeight < initialH * 0.8)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // HorizontalRule is included — used for section breaks
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: toHtml(chapter.content ?? ''),
    editorProps: {
      attributes: {
        class: 'prose-editor',
        spellcheck: 'true',
      },
    },
  })

  const save = useCallback(async () => {
    if (!editor) return
    const html = editor.getHTML()
    const plainText = editor.getText()
    const wc = plainText.trim().split(/\s+/).filter(Boolean).length
    await supabase.from('chapters').update({
      title: titleRef.current,
      content: html,
      word_count: wc,
    }).eq('id', chapter.id)
    onSaved()
  }, [editor, chapter.id, supabase, onSaved])

  // Autosave 3s after the user stops typing
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(save, 3000)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler); if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [editor, save])

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  const publish = async () => {
    await save()
    const next = publishedAt ? null : new Date().toISOString()
    await supabase.from('chapters').update({ published_at: next }).eq('id', chapter.id)
    setPublishedAt(next)
    onSaved(next ? 'Published' : 'Unpublished')
  }

  const deleteChapter = async () => {
    if (!confirm(`Delete "${titleRef.current}"? This cannot be undone.`)) return
    await supabase.from('chapters').delete().eq('id', chapter.id)
    onBack()
  }

  const uploadImage = async (file: File) => {
    if (imgUploadingRef.current) return
    imgUploadingRef.current = true
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `chapters/${chapter.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: false, contentType: file.type })
    if (error) { alert('Image upload failed: ' + error.message); imgUploadingRef.current = false; return }
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    editor?.chain().focus().setImage({ src: data.publicUrl }).run()
    imgUploadingRef.current = false
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor ? editor.isActive(name, attrs) : false

  const wc = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0

  // On mobile: show only Bold / Italic / Blockquote in a floating bar
  const mobileToolbar = isMobile

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ───────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 57, zIndex: 50,
        background: 'var(--paper)', borderBottom: '1px solid var(--rule)',
        padding: '0 var(--page-pad)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <button onClick={onBack} style={ghostBtn}>← Chapters</button>
        <input
          defaultValue={chapter.title}
          onChange={e => { titleRef.current = e.target.value }}
          style={{
            fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 18,
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--ink)', textAlign: 'center', flex: 1,
          }}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)' }}>
            {wc.toLocaleString()} w
          </span>
          <button onClick={deleteChapter} style={{ ...ghostBtn, color: '#9b2b2b', marginRight: 4 }} title="Delete chapter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
          <button onClick={save} className="btn-ghost" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
          <button onClick={publish} className="btn-ink" style={{ fontSize: 13, padding: '6px 16px' }}>
            {publishedAt ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* ── Desktop formatting toolbar ────────────────── */}
      {!mobileToolbar && (
        <div style={{
          position: 'sticky', top: 109, zIndex: 49,
          background: 'var(--paper-warm)', borderBottom: '1px solid var(--rule)',
          padding: '0 var(--page-pad)', height: 44,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <ToolBtn active={isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold (⌘B)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
          </ToolBtn>
          <ToolBtn active={isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
          </ToolBtn>
          <div style={{ width: 1, height: 20, background: 'var(--rule)', margin: '0 6px' }} />
          <ToolBtn active={isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Block quote">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
          </ToolBtn>
          <ToolBtn active={false} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Section break">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/></svg>
          </ToolBtn>
          <div style={{ width: 1, height: 20, background: 'var(--rule)', margin: '0 6px' }} />
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
          <ToolBtn active={false} onClick={() => imageInputRef.current?.click()} title="Insert image">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </ToolBtn>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)', paddingRight: 4 }}>Ch. {chapter.number}</span>
        </div>
      )}

      {/* ── Editor area ───────────────────────────────── */}
      <div
        style={{
          flex: 1, maxWidth: 740, width: '100%', margin: '0 auto',
          padding: mobileToolbar
            ? 'clamp(28px,4vw,60px) var(--page-pad) 120px'
            : 'clamp(40px,6vw,80px) var(--page-pad) 120px',
        }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Mobile floating toolbar (above keyboard) ──── */}
      {mobileToolbar && (
        <div style={{
          position: 'fixed',
          bottom: keyboardUp ? 0 : 0,
          left: 0, right: 0,
          zIndex: 60,
          background: 'var(--paper)',
          borderTop: '1px solid var(--rule)',
          padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 4,
          // Slide above keyboard when it's open
          transform: keyboardUp ? 'translateY(0)' : 'translateY(0)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}>
          <ToolBtn active={isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
          </ToolBtn>
          <ToolBtn active={isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
          </ToolBtn>
          <ToolBtn active={isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
          </ToolBtn>
          <div style={{ width: 1, height: 20, background: 'var(--rule)', margin: '0 4px' }} />
          <ToolBtn active={false} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Break">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/></svg>
          </ToolBtn>
          <div style={{ flex: 1 }} />
          <button onClick={save} style={{ ...ghostBtn, border: '1px solid var(--rule)', borderRadius: 6, padding: '6px 14px', minHeight: 'unset' }}>Save</button>
          <button onClick={publish} className="btn-ink" style={{ fontSize: 12, padding: '6px 14px' }}>
            {publishedAt ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      )}

      {/* Global styles for the editor */}
      <style>{`
        .prose-editor {
          font-family: var(--serif);
          font-size: 19px;
          line-height: 1.85;
          color: var(--ink);
          outline: none;
          min-height: 60vh;
        }
        .prose-editor p {
          margin: 0 0 1.4em;
        }
        .prose-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--ink-faint);
          pointer-events: none;
          position: absolute;
        }
        .prose-editor strong { font-weight: 600; }
        .prose-editor em { font-style: italic; }
        .prose-editor blockquote {
          border-left: 3px solid var(--ink-faint);
          margin: 2em 0;
          padding: 0.5em 0 0.5em 1.5em;
          font-style: italic;
          color: var(--ink-mute);
        }
        .prose-editor hr {
          border: none;
          text-align: center;
          margin: 2.5em 0;
          color: var(--ink-mute);
        }
        .prose-editor hr::after {
          content: '* * *';
          font-family: var(--serif);
          font-size: 16px;
          letter-spacing: 0.5em;
        }
        .prose-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 2em auto;
          border-radius: 2px;
        }
        .prose-editor .ProseMirror-focused { outline: none; }
        @media (max-width: 640px) {
          .prose-editor { font-size: 18px; line-height: 1.8; }
        }
      `}</style>
    </div>
  )
}

function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 4,
        background: active ? 'var(--paper-deep)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        transition: 'background 120ms, color 120ms',
      }}
    >
      {children}
    </button>
  )
}

const ghostBtn: React.CSSProperties = {
  fontFamily: 'var(--sans)', fontSize: 13, background: 'none',
  border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: '2px 0',
}

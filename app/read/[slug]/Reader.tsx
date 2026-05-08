'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Novel, Chapter } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  novel: Novel & { profiles: { username: string; display_name: string | null } }
  chapters: Chapter[]
  initialChapter: Chapter
}

type Theme = 'light' | 'sepia' | 'night'

const THEMES: Record<Theme, { paper: string; ink: string; inkMute: string; rule: string; label: string }> = {
  light: { paper: '#ffffff', ink: '#242424', inkMute: '#6b6b6b', rule: 'rgba(0,0,0,0.08)', label: 'Light' },
  sepia: { paper: '#f8f1e3', ink: '#3b2e1a', inkMute: '#7a6547', rule: 'rgba(80,60,20,0.12)', label: 'Sepia' },
  night: { paper: '#18181b', ink: '#e4e4e7', inkMute: '#a1a1aa', rule: 'rgba(255,255,255,0.08)', label: 'Night' },
}

export default function Reader({ novel, chapters, initialChapter }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [chapter, setChapter] = useState(initialChapter)
  const [fontSize, setFontSize] = useState(20)
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const [themeOpen, setThemeOpen] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const lastTap = useRef<number>(0)
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveProgressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const idx = chapters.findIndex(c => c.id === chapter.id)
  const prev = chapters[idx - 1] ?? null
  const next = chapters[idx + 1] ?? null

  const t = THEMES[theme]

  // Save reading progress (debounced, only for logged-in users)
  const saveProgress = useCallback((chapterNumber: number, scrollPosition: number) => {
    if (saveProgressTimer.current) clearTimeout(saveProgressTimer.current)
    saveProgressTimer.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('reading_progress').upsert({
        user_id: user.id,
        novel_id: novel.id,
        chapter_number: chapterNumber,
        scroll_position: scrollPosition,
      }, { onConflict: 'user_id,novel_id' })
    }, 1500)
  }, [supabase, novel.id])

  // Save progress on scroll
  useEffect(() => {
    function onScroll() {
      const scrollPct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)
      saveProgress(chapter.number, Math.round(scrollPct * 1000) / 1000)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [chapter.number, saveProgress])

  // Scroll to top on chapter change; save the new chapter as progress immediately
  useEffect(() => {
    window.scrollTo({ top: 0 })
    saveProgress(chapter.number, 0)
  }, [chapter.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('prosa-theme') as Theme | null
    if (saved && THEMES[saved]) setTheme(saved)
  }, [])

  const goTo = useCallback((ch: Chapter) => {
    setChapter(ch); setNavOpen(false)
    router.replace(`/read/${novel.slug}?ch=${ch.number}`, { scroll: false })
  }, [novel.slug, router])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && next) goTo(next)
      if (e.key === 'ArrowLeft' && prev) goTo(prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, goTo])

  // Auto-hide chrome after 3s of inactivity
  const showChrome = useCallback(() => {
    setChromeVisible(true)
    if (chromeTimer.current) clearTimeout(chromeTimer.current)
    chromeTimer.current = setTimeout(() => setChromeVisible(false), 3000)
  }, [])

  // Tap to toggle chrome (mobile)
  const handleContentTap = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Don't intercept taps on links or buttons
    if (target.closest('a') || target.closest('button')) return
    const now = Date.now()
    if (now - lastTap.current < 300) return // double-tap guard
    lastTap.current = now
    setChromeVisible(v => !v)
  }, [])

  // Swipe left/right
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    // Require horizontal swipe > 60px and fairly horizontal
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return
    if (dx < 0 && next) goTo(next)   // swipe left → next
    if (dx > 0 && prev) goTo(prev)   // swipe right → prev
  }, [prev, next, goTo])

  const setAndSaveTheme = (t: Theme) => {
    setTheme(t)
    setThemeOpen(false)
    localStorage.setItem('prosa-theme', t)
  }

  const isHtml = chapter.content.includes('<p') || chapter.content.includes('<br') || chapter.content.startsWith('<')
  const paragraphs = isHtml ? [] : chapter.content.split(/\n+/).map(p => p.trim()).filter(Boolean)

  const chromeStyle: React.CSSProperties = {
    transition: 'opacity 280ms ease, visibility 280ms ease',
    opacity: chromeVisible ? 1 : 0,
    visibility: chromeVisible ? 'visible' : 'hidden',
    pointerEvents: chromeVisible ? 'auto' : 'none',
  }

  return (
    <div
      style={{ minHeight: '100vh', background: t.paper, color: t.ink }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContentTap}
    >

      {/* ── Reader toolbar ─────────────────────── */}
      <div style={{
        ...chromeStyle,
        position: 'sticky', top: 57, zIndex: 50,
        background: t.paper, borderBottom: `1px solid ${t.rule}`,
        padding: '0 var(--page-pad)', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={(e) => { e.stopPropagation(); setNavOpen(o => !o) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.inkMute, fontFamily: 'var(--sans)', fontSize: 13, padding: 0 }}>
            Contents
          </button>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: t.inkMute, opacity: 0.5 }}>
            {chapter.number} / {chapters.length}
          </span>
        </div>

        {/* Center: theme + font */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          {/* Theme picker */}
          <button
            onClick={(e) => { e.stopPropagation(); setThemeOpen(o => !o) }}
            title="Reading theme"
            style={{ background: 'none', border: `1px solid ${t.rule}`, borderRadius: 4, cursor: 'pointer', color: t.inkMute, fontFamily: 'var(--sans)', fontSize: 12, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {/* sun/moon icon */}
            {theme === 'night'
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            }
            <span className="hide-xs">{t.label}</span>
          </button>

          {/* Theme dropdown */}
          {themeOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                marginTop: 8, background: t.paper, border: `1px solid ${t.rule}`,
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                zIndex: 60, overflow: 'hidden', minWidth: 160,
              }}
            >
              {(Object.entries(THEMES) as [Theme, typeof THEMES[Theme]][]).map(([key, val]) => (
                <button key={key} onClick={() => setAndSaveTheme(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '11px 16px',
                  background: theme === key ? val.paper : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--sans)', fontSize: 14,
                  color: val.ink,
                  borderBottom: `1px solid ${val.rule}`,
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: val.paper, border: `2px solid ${val.ink}`, display: 'inline-block', flexShrink: 0 }} />
                  {val.label}
                  {theme === key && <span style={{ marginLeft: 'auto', color: val.inkMute }}>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Font size */}
          <button onClick={(e) => { e.stopPropagation(); setFontSize(s => Math.max(15, s - 1)) }} style={{ background: 'none', border: `1px solid ${t.rule}`, borderRadius: 4, cursor: 'pointer', color: t.inkMute, fontFamily: 'var(--sans)', fontSize: 12, padding: '3px 8px' }}>A−</button>
          <button onClick={(e) => { e.stopPropagation(); setFontSize(s => Math.min(26, s + 1)) }} style={{ background: 'none', border: `1px solid ${t.rule}`, borderRadius: 4, cursor: 'pointer', color: t.inkMute, fontFamily: 'var(--sans)', fontSize: 12, padding: '3px 8px' }}>A+</button>
        </div>

        {/* Prev / Next */}
        <div style={{ display: 'flex', gap: 12 }}>
          {prev
            ? <button onClick={(e) => { e.stopPropagation(); goTo(prev) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: t.inkMute, padding: 0 }}>← Prev</button>
            : <span />}
          {next
            ? <button onClick={(e) => { e.stopPropagation(); goTo(next) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: t.ink, padding: 0 }}>Next →</button>
            : <Link href={`/book/${novel.slug}`} style={{ fontFamily: 'var(--sans)', fontSize: 13, color: t.ink, textDecoration: 'none' }}>Finish</Link>}
        </div>
      </div>

      {/* ── Chapter drawer ──────────────────────── */}
      {navOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)' }} onClick={() => setNavOpen(false)}>
          <nav onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 320, background: t.paper, overflowY: 'auto', boxShadow: '4px 0 24px rgba(0,0,0,0.10)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.rule}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: t.inkMute, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contents</p>
                <p style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 20, margin: 0, fontWeight: 500, color: t.ink }}>{novel.title}</p>
              </div>
              <button onClick={() => setNavOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.inkMute }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {chapters.map(ch => (
              <button key={ch.id} onClick={() => goTo(ch)} style={{
                display: 'flex', alignItems: 'baseline', gap: 14, width: '100%',
                padding: '14px 24px', background: ch.id === chapter.id ? t.rule : 'transparent',
                border: 'none', borderBottom: `1px solid ${t.rule}`, cursor: 'pointer', textAlign: 'left',
              } as React.CSSProperties}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: t.inkMute, opacity: 0.6, minWidth: 24 }}>{String(ch.number).padStart(2, '0')}</span>
                <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 17, color: t.ink, fontWeight: ch.id === chapter.id ? 600 : 400 }}>{ch.title}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Chapter content ─────────────────────── */}
      <article style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: 'clamp(48px,7vw,96px) var(--page-pad) clamp(80px,12vw,160px)' }}>
        <header style={{ marginBottom: 52 }}>
          <Link href={`/book/${novel.slug}`} style={{ fontFamily: 'var(--sans)', fontSize: 13, color: t.inkMute, textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            ← {novel.title}
          </Link>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: t.inkMute, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Chapter {chapter.number}
          </p>
          <h1 style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(28px,3.5vw,42px)', lineHeight: 1.1, margin: '0 0 28px', color: t.ink }}>
            {chapter.title}
          </h1>
          <hr style={{ border: 'none', borderTop: `1px solid ${t.rule}`, margin: 0 }} />
        </header>

        {isHtml ? (
          <div className="prose" style={{ fontSize, color: t.ink }} dangerouslySetInnerHTML={{ __html: chapter.content }} />
        ) : (
          <div className="prose" style={{ fontSize, color: t.ink }}>
            {paragraphs.map((p, i) => <p key={i} style={{ margin: '0 0 1.5em' }}>{p}</p>)}
          </div>
        )}

        <footer style={{ marginTop: 80, paddingTop: 32, borderTop: `1px solid ${t.rule}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {prev
            ? <button onClick={() => goTo(prev)} className="btn-ghost" style={{ fontSize: 13 }}>← {prev.title}</button>
            : <Link href={`/book/${novel.slug}`} className="btn-ghost" style={{ fontSize: 13 }}>↑ Novel page</Link>}
          {next
            ? <button onClick={() => goTo(next)} className="btn-ink" style={{ fontSize: 13 }}>{next.title} →</button>
            : <Link href={`/book/${novel.slug}`} className="btn-ink" style={{ fontSize: 13 }}>Finished · Back to novel</Link>}
        </footer>
      </article>

      {/* Swipe hint (mobile only, fades out) */}
      <div className="swipe-hint" style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: t.inkMute, opacity: 0.5, background: t.paper, padding: '4px 12px', borderRadius: 999, border: `1px solid ${t.rule}` }}>
          swipe to navigate
        </span>
      </div>

      <style>{`
        .prose p { margin: 0 0 1.5em; }
        .prose blockquote {
          border-left: 3px solid rgba(128,128,128,0.3);
          margin: 2em 0; padding: 0.5em 0 0.5em 1.5em;
          font-style: italic; color: ${t.inkMute};
        }
        .prose hr { border: none; text-align: center; margin: 2.5em 0; }
        .prose hr::after {
          content: '* * *';
          font-family: var(--serif); font-size: 16px;
          letter-spacing: 0.5em; color: ${t.inkMute};
        }
        .prose img { max-width: 100%; height: auto; display: block; margin: 2em auto; border-radius: 2px; }
        .prose strong { font-weight: 600; }

        /* Mobile typography boost */
        @media (max-width: 640px) {
          .prose { font-size: 19px !important; line-height: 1.9 !important; }
          .prose p:first-of-type::first-letter { font-size: 3em; }
        }

        /* Swipe hint auto-hides */
        .swipe-hint { animation: fadeHint 3s ease 1.5s forwards; }
        @keyframes fadeHint { to { opacity: 0; } }
        @media (min-width: 641px) { .swipe-hint { display: none !important; } }

        /* Hide label text on very small screens */
        @media (max-width: 380px) { .hide-xs { display: none; } }
      `}</style>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractExcerpt(content: string): string[] {
  if (!content) return []
  return content
    .split(/<\/p>/gi)
    .map(p => stripHtml(p))
    .filter(p => p.length > 60)
    .slice(0, 3)
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, slug, tagline')
    .eq('slug', 'the-boy-and-the-sea')
    .gt('published_chapters', 0)
    .single()

  let excerptParagraphs: string[] = []
  if (novel) {
    const { data: chapter } = await supabase
      .from('chapters')
      .select('content')
      .eq('novel_id', novel.id)
      .not('published_at', 'is', null)
      .order('number', { ascending: true })
      .limit(1)
      .single()

    if (chapter?.content) {
      excerptParagraphs = extractExcerpt(chapter.content)
    }
  }

  const slug = novel?.slug ?? 'the-boy-and-the-sea'
  const tagline = novel?.tagline ?? 'Some loves are not meant to last.\nSome oceans never let go.'

  return (
    <>
      <style>{`
        body { background: #070a0f !important; }

        /* ── Animated ocean background ── */
        .hero-ocean {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 90% 50% at 50% 100%, rgba(12,32,54,0.85) 0%, transparent 65%),
            radial-gradient(ellipse 60% 35% at 20% 65%, rgba(8,20,36,0.5) 0%, transparent 55%),
            radial-gradient(ellipse 55% 30% at 80% 45%, rgba(14,26,42,0.4) 0%, transparent 50%),
            linear-gradient(180deg, #04060b 0%, #070d18 25%, #091320 55%, #060b14 100%);
          animation: oceanShift 28s ease-in-out infinite;
        }
        @keyframes oceanShift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        .hero-fog {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 110% 45% at 50% 58%, rgba(18, 42, 68, 0.28) 0%, transparent 65%),
            radial-gradient(ellipse 80% 25% at 50% 45%, rgba(12, 30, 50, 0.2) 0%, transparent 60%);
          animation: fogFloat 22s ease-in-out infinite alternate;
        }
        @keyframes fogFloat {
          from { transform: translateY(0) scaleX(1); opacity: 0.8; }
          to   { transform: translateY(-18px) scaleX(1.04); opacity: 1; }
        }

        /* Horizon line */
        .hero-horizon {
          position: absolute;
          left: 0; right: 0;
          top: 62%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(140,168,190,0.08), rgba(140,168,190,0.14), rgba(140,168,190,0.08), transparent);
          animation: horizonPulse 8s ease-in-out infinite;
        }
        @keyframes horizonPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* ── Entrance animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-0 { animation: fadeUp 1.4s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .anim-1 { animation: fadeUp 1.4s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .anim-2 { animation: fadeUp 1.4s cubic-bezier(0.16,1,0.3,1) 0.55s both; }
        .anim-3 { animation: fadeUp 1.4s cubic-bezier(0.16,1,0.3,1) 0.75s both; }

        /* ── Scroll indicator ── */
        @keyframes scrollDrop {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50%       { transform: translateY(10px); opacity: 0.7; }
        }
        .scroll-cue { animation: scrollDrop 2.6s ease-in-out infinite; }

        /* ── CTA buttons (dark theme) ── */
        .cta-primary {
          display: inline-flex; align-items: center;
          padding: 12px 28px;
          background: rgba(232,228,220,0.95);
          color: #070a0f;
          border: none; border-radius: 999px;
          font-family: var(--sans); font-size: 13px; font-weight: 500;
          letter-spacing: 0.04em; text-decoration: none; cursor: pointer;
          transition: background 160ms, transform 160ms;
        }
        .cta-primary:hover { background: #ffffff; transform: translateY(-1px); }

        .cta-ghost {
          display: inline-flex; align-items: center;
          padding: 12px 28px;
          background: transparent;
          color: rgba(200,210,218,0.75);
          border: 1px solid rgba(140,168,190,0.25); border-radius: 999px;
          font-family: var(--sans); font-size: 13px; font-weight: 400;
          letter-spacing: 0.04em; text-decoration: none; cursor: pointer;
          transition: border-color 160ms, color 160ms, transform 160ms;
        }
        .cta-ghost:hover { border-color: rgba(140,168,190,0.55); color: #e8e4dc; transform: translateY(-1px); }

        /* ── Section label ── */
        .section-label {
          font-family: var(--sans);
          font-size: 10px;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: rgba(140,168,190,0.55);
          margin: 0 0 32px;
        }

        /* ── Divider ── */
        .dark-rule {
          height: 1px;
          background: rgba(255,255,255,0.06);
          border: none;
          margin: 0;
        }

        /* ── Excerpt drop cap ── */
        .excerpt-text p:first-of-type::first-letter {
          font-size: 3.6em;
          line-height: 0.8;
          float: left;
          margin-right: 8px;
          margin-top: 8px;
          font-family: var(--display);
          font-weight: 600;
          color: rgba(140,168,190,0.6);
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero-cta-row { flex-direction: column; align-items: center; }
          .author-grid { flex-direction: column; align-items: center; text-align: center; }
        }
      `}</style>

      <div style={{ background: '#070a0f', color: '#e8e4dc', minHeight: '100vh' }}>

        {/* ══════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════ */}
        <section style={{
          position: 'relative',
          minHeight: 'calc(100svh - var(--nav-height))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: 'clamp(60px,10vw,100px) clamp(20px,6vw,80px)',
          textAlign: 'center',
        }}>
          <div className="hero-ocean" />
          <div className="hero-fog" />
          <div className="hero-horizon" />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 780 }}>
            <p className="anim-0 section-label" style={{ marginBottom: 40 }}>
              A Novel
            </p>

            <h1 className="anim-1" style={{
              fontFamily: 'var(--display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(52px, 9.5vw, 112px)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: '#e8e4dc',
              margin: '0 0 36px',
            }}>
              The Boy<br />and the Sea
            </h1>

            <p className="anim-2" style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(16px, 2vw, 20px)',
              lineHeight: 1.7,
              color: 'rgba(140,168,190,0.75)',
              margin: '0 0 52px',
              maxWidth: 420,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {tagline.split('\n').map((line: string, i: number) => (
                <span key={i}>{line}{i < tagline.split('\n').length - 1 && <br />}</span>
              ))}
            </p>

            <div className="anim-3 hero-cta-row" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/read/${slug}`} className="cta-primary">
                Read Preview
              </Link>
              <a href="#about" className="cta-ghost">
                About the Novel
              </a>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="scroll-cue" style={{
            position: 'absolute',
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(140,168,190,0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </section>

        <hr className="dark-rule" />

        {/* ══════════════════════════════════════════════
            EXCERPT
        ══════════════════════════════════════════════ */}
        <section style={{
          padding: 'clamp(80px,10vw,120px) clamp(20px,6vw,80px)',
          maxWidth: 680,
          margin: '0 auto',
        }}>
          <p className="section-label">An Excerpt</p>

          {excerptParagraphs.length > 0 ? (
            <div className="excerpt-text" style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(19px, 2.2vw, 22px)',
              lineHeight: 1.9,
              color: 'rgba(232,228,220,0.85)',
              letterSpacing: '0.01em',
            }}>
              {excerptParagraphs.map((para, i) => (
                <p key={i} style={{ margin: '0 0 1.6em' }}>{para}</p>
              ))}
            </div>
          ) : (
            <div className="excerpt-text" style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(19px, 2.2vw, 22px)',
              lineHeight: 1.9,
              color: 'rgba(232,228,220,0.85)',
              letterSpacing: '0.01em',
            }}>
              <p style={{ margin: '0 0 1.6em' }}>
                He had never asked the sea for anything. Not for luck, not for calm water, not for safe return. His father had taught him that the sea doesn't answer prayers — it only answers presence. So every morning before the light came, he came to the water's edge and stood there without asking, just to be known.
              </p>
              <p style={{ margin: '0 0 1.6em' }}>
                That was how it started, the way all quiet loves begin: in the habit of showing up. And the sea, as seas do, began to respond in its language — not in words but in temperature, in the color it chose each dawn, in the precise depth of its silence when he arrived.
              </p>
            </div>
          )}

          <Link href={`/read/${slug}`} style={{
            display: 'inline-block',
            marginTop: 12,
            fontFamily: 'var(--sans)',
            fontSize: 13,
            letterSpacing: '0.06em',
            color: 'rgba(140,168,190,0.65)',
            textDecoration: 'none',
            transition: 'color 160ms',
          }}
          onMouseEnter={undefined}
          >
            Continue reading →
          </Link>
        </section>

        <hr className="dark-rule" />

        {/* ══════════════════════════════════════════════
            ABOUT
        ══════════════════════════════════════════════ */}
        <section id="about" style={{
          padding: 'clamp(80px,10vw,120px) clamp(20px,6vw,80px)',
          maxWidth: 800,
          margin: '0 auto',
        }}>
          <p className="section-label">About the Novel</p>

          <h2 style={{
            fontFamily: 'var(--display)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(28px, 4vw, 46px)',
            lineHeight: 1.15,
            color: '#e8e4dc',
            margin: '0 0 40px',
            maxWidth: 640,
            letterSpacing: '-0.01em',
          }}>
            A brief and tragic love story<br />with the sea.
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'clamp(32px, 4vw, 52px)',
          }}>
            {[
              {
                label: 'Longing',
                body: 'A boy who returns to the shoreline every morning before dawn. Not out of habit, but out of something deeper — a pull he cannot name and cannot resist.',
              },
              {
                label: 'Memory',
                body: 'The sea remembers everything. It holds the weight of his childhood, the shape of his grief, the echo of everyone who ever stood at its edge and looked outward.',
              },
              {
                label: 'Loss',
                body: 'Some love stories don\'t end with people. Some end with weather, with tides, with the particular silence of a morning you realize the sea has taken something from you forever.',
              },
              {
                label: 'Wonder',
                body: 'There is beauty here, even inside the tragedy. The novel asks what it means to love something that was never yours — and whether the loving was enough.',
              },
            ].map(({ label, body }) => (
              <div key={label}>
                <p style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(140,168,190,0.5)',
                  margin: '0 0 14px',
                }}>{label}</p>
                <p style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: 'rgba(200,196,188,0.72)',
                  margin: 0,
                }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="dark-rule" />

        {/* ══════════════════════════════════════════════
            AUTHOR
        ══════════════════════════════════════════════ */}
        <section style={{
          padding: 'clamp(80px,10vw,120px) clamp(20px,6vw,80px)',
          maxWidth: 800,
          margin: '0 auto',
        }}>
          <p className="section-label">The Author</p>

          <div className="author-grid" style={{ display: 'flex', gap: 'clamp(32px,5vw,72px)', alignItems: 'center' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid rgba(140,168,190,0.15)',
                background: 'rgba(14,22,32,0.8)',
              }}>
                {/* Place your photo at /public/author.jpg */}
                <img
                  src="/author.jpg"
                  alt="Author"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                  onError={undefined}
                />
              </div>
            </div>

            <div>
              <h3 style={{
                fontFamily: 'var(--display)',
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(28px, 3.5vw, 40px)',
                color: '#e8e4dc',
                margin: '0 0 16px',
                letterSpacing: '-0.01em',
              }}>
                T.J. Ho
              </h3>
              <p style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.8,
                color: 'rgba(140,168,190,0.6)',
                margin: 0,
                maxWidth: 380,
              }}>
                Writing from the edge of memory and the weight of water.
              </p>
            </div>
          </div>
        </section>

        <hr className="dark-rule" />

        {/* ══════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════ */}
        <footer style={{
          padding: 'clamp(32px,4vw,48px) clamp(20px,6vw,80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          maxWidth: 'var(--wide-width)',
          margin: '0 auto',
        }}>
          <span style={{
            fontFamily: 'var(--display)',
            fontStyle: 'italic',
            fontSize: 20,
            color: 'rgba(232,228,220,0.4)',
          }}>
            The Boy and the Sea
          </span>
          <span style={{
            fontFamily: 'var(--sans)',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'rgba(140,168,190,0.3)',
          }}>
            © 2026 T.J. Ho
          </span>
        </footer>

      </div>
    </>
  )
}

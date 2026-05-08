import type { Metadata, Viewport } from 'next'
import '@/styles/tokens.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: { default: 'Prosa', template: '%s · Prosa' },
  description: 'A quiet place for serious novels.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prosa',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="grain">
        <Nav />
        <main>{children}</main>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {})
              })
            }
          `
        }} />
      </body>
    </html>
  )
}

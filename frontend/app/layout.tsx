import type { Metadata } from 'next'
import { Fira_Code } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { SocketProvider } from '@/components/SocketProvider'
import './globals.css'

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Market Sentiment Intelligence Dashboard',
  description: 'Real-time crypto sentiment analysis and trading intelligence',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${firaCode.variable}`}>
      <body className={`${firaCode.className} antialiased bg-background text-foreground`}>
        <SocketProvider>
          {children}
        </SocketProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}

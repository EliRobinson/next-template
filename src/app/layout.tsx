import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono as GeistMono } from 'next/font/google'
import { Providers } from '@/components/providers'
import '@elirobinson/tokens/tokens.css'
import '@elirobinson/react/styles.css'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = GeistMono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: {
    template: '%s | Next Template',
    default: 'Next Template'
  },
  description: 'A production-ready Next.js starter template.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  // The font variables go on <html>, not <body>, so that the :root rule in
  // globals.css can repoint the design system's family tokens at them.
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className='antialiased'>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

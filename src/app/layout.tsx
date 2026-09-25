import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from '@/components/providers'
import './styles'

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
  return (
    <html lang='en'>
      <body className='antialiased'>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

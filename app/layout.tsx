import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminShell } from '@/components/admin-shell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pizza Admin Panel',
  description: 'Modern admin panel for pizza ordering system',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={inter.className}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}

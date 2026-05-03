import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminShell } from '@/components/admin-shell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pizza Admin Panel',
  description: 'Modern admin panel for pizza ordering system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}

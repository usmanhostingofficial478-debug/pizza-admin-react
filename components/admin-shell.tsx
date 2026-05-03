'use client'

import { Sidebar } from './sidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 bg-background">
        {children}
      </main>
    </div>
  )
}

"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Sidebar />
      <main className="pl-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}

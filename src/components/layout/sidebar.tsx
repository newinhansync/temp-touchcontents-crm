"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Sparkles, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MenuItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const menuItems: MenuItem[] = [
  {
    title: "콘텐츠 관리",
    href: "/",
    icon: LayoutDashboard,
    description: "콘텐츠 목록 및 관리",
  },
  {
    title: "AI 추천",
    href: "/packages",
    icon: Sparkles,
    description: "AI 기반 콘텐츠 추천",
  },
  {
    title: "패키지 목록",
    href: "/packages/list",
    icon: Package,
    description: "생성된 패키지 관리",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo/Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TC</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">Touch Contents</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">TC</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-blue-600 dark:text-blue-400")} />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{item.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">{item.description}</span>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              접기
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}

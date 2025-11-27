"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Package,
  FileText,
  ArrowRight,
  Clock,
  Building2,
  Users,
  TrendingUp
} from "lucide-react"

interface PackageStats {
  totalPackages: number
  activePackages: number
  totalContentsInPackages: number
  contentCount: number
}

interface RecentPackage {
  id: number
  name: string
  targetCompany: string
  targetGroup: string | null
  status: string
  createdAt: string
  _count: {
    items: number
  }
}

export default function PackagesPage() {
  const [stats, setStats] = React.useState<PackageStats>({
    totalPackages: 0,
    activePackages: 0,
    totalContentsInPackages: 0,
    contentCount: 0
  })
  const [recentPackages, setRecentPackages] = React.useState<RecentPackage[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [statsRes, packagesRes] = await Promise.all([
          fetch("/api/packages/stats"),
          fetch("/api/packages?pageSize=5")
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (packagesRes.ok) {
          const packagesData = await packagesRes.json()
          setRecentPackages(packagesData.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-8 w-8" />
              <h1 className="text-4xl font-bold">AI 콘텐츠 추천</h1>
            </div>
            <p className="text-purple-100 text-lg">
              AI가 고객사 요구사항을 분석하여 최적의 교육 콘텐츠 패키지를 추천합니다
            </p>
          </div>
          <Link href="/packages/new">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 shadow-md">
              <Sparkles className="mr-2 h-5 w-5" />
              새로운 추천 시작
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">전체 패키지</div>
              <div className="text-2xl font-bold">{isLoading ? "-" : stats.totalPackages}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">활성 패키지</div>
              <div className="text-2xl font-bold">{isLoading ? "-" : stats.activePackages}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">포함된 콘텐츠</div>
              <div className="text-2xl font-bold">{isLoading ? "-" : stats.totalContentsInPackages}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">전체 콘텐츠</div>
              <div className="text-2xl font-bold">{isLoading ? "-" : stats.contentCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CTA Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-6 text-white h-full flex flex-col">
            <div className="flex-1">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI와 대화하며 패키지 생성</h3>
              <p className="text-purple-100 text-sm mb-4">
                간단한 대화를 통해 고객사 요구사항을 파악하고,
                AI가 최적의 콘텐츠 조합을 추천해 드립니다.
              </p>
              <ul className="space-y-2 text-sm text-purple-100">
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  기업 정보 수집
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  교육 대상 분석
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  맞춤 콘텐츠 추천
                </li>
              </ul>
            </div>
            <Link href="/packages/new" className="mt-4">
              <Button className="w-full bg-white text-purple-600 hover:bg-purple-50">
                추천 시작하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Packages */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">최근 생성된 패키지</h3>
              <Link href="/packages/list">
                <Button variant="ghost" size="sm">
                  전체보기
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : recentPackages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">아직 생성된 패키지가 없습니다</p>
                <p className="text-sm mt-1">AI 추천을 시작하여 첫 번째 패키지를 만들어보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPackages.map((pkg) => (
                  <Link
                    key={pkg.id}
                    href={`/packages/${pkg.id}`}
                    className="block p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{pkg.name}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            pkg.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {pkg.status === 'active' ? '활성' : '보관'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {pkg.targetCompany}
                          </span>
                          {pkg.targetGroup && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {pkg.targetGroup}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {pkg._count.items}개 콘텐츠
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        {formatDate(pkg.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-6 text-center">AI 추천 프로세스</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">1</span>
            </div>
            <h4 className="font-medium mb-1">대화 시작</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              AI와의 대화를 통해 요구사항 수집을 시작합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">2</span>
            </div>
            <h4 className="font-medium mb-1">정보 수집</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              기업 정보, 교육 대상, 목적 등 9가지 필수 정보를 수집합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">3</span>
            </div>
            <h4 className="font-medium mb-1">AI 분석</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              수집된 정보를 기반으로 최적의 콘텐츠를 분석합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">4</span>
            </div>
            <h4 className="font-medium mb-1">패키지 생성</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              추천 콘텐츠로 구성된 맞춤 패키지가 생성됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

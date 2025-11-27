"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Package,
  Search,
  Plus,
  Building2,
  Users,
  FileText,
  Clock,
  MoreVertical,
  Archive,
  Trash2,
  Eye,
  Sparkles,
  Filter
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PackageItem {
  id: number
  name: string
  description: string | null
  targetCompany: string
  targetGroup: string | null
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    items: number
  }
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function PackageListPage() {
  const [packages, setPackages] = React.useState<PackageItem[]>([])
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const fetchPackages = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      })

      if (searchQuery) {
        params.set("search", searchQuery)
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }

      const res = await fetch(`/api/packages?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPackages(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }))
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, searchQuery, statusFilter])

  React.useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchPackages()
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        fetchPackages()
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 패키지를 삭제하시겠습니까?")) return

    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        fetchPackages()
      }
    } catch (error) {
      console.error("Failed to delete package:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-8 w-8" />
              <h1 className="text-4xl font-bold">패키지 목록</h1>
            </div>
            <p className="text-indigo-100 text-lg">
              생성된 콘텐츠 패키지를 관리하고 확인하세요
            </p>
          </div>
          <Link href="/packages/new">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 shadow-md">
              <Plus className="mr-2 h-5 w-5" />
              새 패키지 생성
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="패키지명 또는 기업명으로 검색..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="archived">보관</option>
            </select>
          </div>
          <Button type="submit">검색</Button>
        </form>
      </div>

      {/* Package List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />
              </div>
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
              패키지가 없습니다
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              AI 추천을 통해 첫 번째 패키지를 만들어보세요
            </p>
            <Link href="/packages/new">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                AI 추천 시작
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/packages/${pkg.id}`}>
                        <h3 className="font-semibold text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {pkg.name}
                        </h3>
                      </Link>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        pkg.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {pkg.status === 'active' ? '활성' : '보관'}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-1">
                        {pkg.description}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {pkg.targetCompany}
                      </span>
                      {pkg.targetGroup && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {pkg.targetGroup}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {pkg._count.items}개 콘텐츠
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {formatDate(pkg.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/packages/${pkg.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(
                            pkg.id,
                            pkg.status === 'active' ? 'archived' : 'active'
                          )}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {pkg.status === 'active' ? '보관하기' : '활성화'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(pkg.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && packages.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              총 {pagination.total}개 중 {(pagination.page - 1) * pagination.pageSize + 1}-
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}개 표시
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                이전
              </Button>
              <span className="text-sm px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

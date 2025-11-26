"use client"

import * as React from "react"
import { DataTable } from "@/components/data-table/data-table"
import { getColumns, Content } from "@/components/data-table/columns"
import { FilterPanel } from "@/components/filters/filter-panel"
import { SearchBar } from "@/components/search-bar"
import { ContentDetail } from "@/components/content-detail"
import { Button } from "@/components/ui/button"
import { FilterOptions } from "@/lib/types"
import { Download, Plus, RefreshCw, X, LayoutGrid, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CardView } from "@/components/data-table/card-view"

type ViewMode = "table" | "card"

export default function Home() {
  const [data, setData] = React.useState<Content[]>([])
  const [filters, setFilters] = React.useState<FilterOptions | null>(null)
  const [currentFilters, setCurrentFilters] = React.useState<Record<string, any>>({})
  const [pagination, setPagination] = React.useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchValue, setSearchValue] = React.useState("")
  const [searchField, setSearchField] = React.useState("all")
  const [selectedContent, setSelectedContent] = React.useState<Content | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>("table")

  // Fetch filter options
  React.useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch("/api/contents/filters")
        const data = await res.json()
        setFilters(data)
      } catch (error) {
        console.error("Failed to fetch filters:", error)
      }
    }
    fetchFilters()
  }, [])

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", pagination.page.toString())
      params.set("pageSize", pagination.pageSize.toString())

      // Add filters
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v))
          } else {
            params.set(key, value.toString())
          }
        }
      })

      // Add search
      if (searchValue) {
        params.set("search", searchValue)
        params.set("searchField", searchField)
      }

      const res = await fetch(`/api/contents?${params.toString()}`)
      const result = await res.json()

      setData(result.data)
      setPagination((prev) => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }))
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, currentFilters, searchValue, searchField])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({ ...prev, page: 1, pageSize }))
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setCurrentFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterReset = () => {
    setCurrentFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearch = (value: string, field: string) => {
    setSearchValue(value)
    setSearchField(field)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleView = (content: Content) => {
    setSelectedContent(content)
    setDetailOpen(true)
  }

  const handleEdit = (content: Content) => {
    // TODO: Implement edit functionality
    console.log("Edit:", content)
  }

  const handleDelete = async (content: Content) => {
    if (!confirm(`"${content.courseName}"을(를) 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/contents/${content.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchData()
      } else {
        alert("삭제에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to delete:", error)
      alert("삭제에 실패했습니다.")
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()

      // Add current filters
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v))
          } else {
            params.set(key, value.toString())
          }
        }
      })

      // Add search
      if (searchValue) {
        params.set("search", searchValue)
        params.set("searchField", searchField)
      }

      const res = await fetch(`/api/contents/export?${params.toString()}`)
      const blob = await res.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `contents_export_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export:", error)
      alert("내보내기에 실패했습니다.")
    }
  }

  const columns = getColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-[1600px] mx-auto p-8 space-y-6">
        {/* Enhanced Header with Gradient */}
        <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Touch Contents CRM</h1>
              <p className="text-blue-100">콘텐츠를 효율적으로 관리하고 분석하세요</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={fetchData} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button variant="secondary" onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Download className="mr-2 h-4 w-4" />
                Excel 내보내기
              </Button>
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                <Plus className="mr-2 h-4 w-4" />
                새 콘텐츠
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">전체 콘텐츠</div>
            <div className="text-3xl font-bold mt-2">{pagination.total.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">활성 필터</div>
            <div className="text-3xl font-bold mt-2">{Object.keys(currentFilters).filter(k => currentFilters[k]).length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">현재 페이지</div>
            <div className="text-3xl font-bold mt-2">{pagination.page} / {pagination.totalPages}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">검색 결과</div>
            <div className="text-3xl font-bold mt-2">{data.length}</div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchValue}
                field={searchField}
                onSearch={handleSearch}
              />
            </div>
            {/* View Mode Toggle */}
            <div className="flex gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <FilterPanel
              filters={filters}
              currentFilters={currentFilters}
              onFilterChange={handleFilterChange}
              onReset={handleFilterReset}
            />
          </div>

          {/* Active Filters Display */}
          {Object.keys(currentFilters).filter(k => currentFilters[k]).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400 self-center">활성 필터:</span>
              {Object.entries(currentFilters).map(([key, value]) => {
                if (!value) return null
                const displayValue = Array.isArray(value) ? value.join(", ") : value
                return (
                  <Badge key={key} variant="secondary" className="gap-1">
                    <span className="font-medium">{key}:</span> {displayValue.toString()}
                    <button
                      onClick={() => {
                        const newFilters = { ...currentFilters }
                        delete newFilters[key]
                        handleFilterChange(newFilters)
                      }}
                      className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        {/* Data Display Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          {viewMode === "table" ? (
            <DataTable
              columns={columns}
              data={data}
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
            />
          ) : (
            <>
              <CardView
                data={data}
                isLoading={isLoading}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />

              {/* Pagination for Card View */}
              {!isLoading && data.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">페이지당</span>
                    <select
                      value={pagination.pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {pagination.page} / {pagination.totalPages} 페이지
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ContentDetail
          content={selectedContent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    </main>
  )
}

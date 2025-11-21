"use client"

import * as React from "react"
import { DataTable } from "@/components/data-table/data-table"
import { getColumns, Content } from "@/components/data-table/columns"
import { FilterPanel } from "@/components/filters/filter-panel"
import { SearchBar } from "@/components/search-bar"
import { ContentDetail } from "@/components/content-detail"
import { Button } from "@/components/ui/button"
import { FilterOptions } from "@/lib/types"
import { Download, Plus, RefreshCw } from "lucide-react"

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
    <main className="min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Touch Contents CRM</h1>
            <p className="text-muted-foreground">콘텐츠 관리 시스템</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Excel 내보내기
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 콘텐츠
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchValue}
              field={searchField}
              onSearch={handleSearch}
            />
          </div>
          <FilterPanel
            filters={filters}
            currentFilters={currentFilters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
          />
        </div>

        <DataTable
          columns={columns}
          data={data}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
        />

        <ContentDetail
          content={selectedContent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    </main>
  )
}

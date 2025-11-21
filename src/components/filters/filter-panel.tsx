"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Filter, X, RotateCcw } from "lucide-react"
import { FilterOptions } from "@/lib/types"

interface FilterPanelProps {
  filters: FilterOptions | null
  currentFilters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void
  onReset: () => void
}

export function FilterPanel({
  filters,
  currentFilters,
  onFilterChange,
  onReset,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = React.useState(currentFilters)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setLocalFilters(currentFilters)
  }, [currentFilters])

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key]
    }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFilterChange(localFilters)
    setOpen(false)
  }

  const activeFilterCount = Object.keys(currentFilters).filter(
    (key) => currentFilters[key] && currentFilters[key] !== ""
  ).length

  if (!filters) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          필터
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 rounded-full px-2 py-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] overflow-y-auto sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>필터 설정</SheetTitle>
          <SheetDescription>
            원하는 조건으로 콘텐츠를 필터링합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Category Filters */}
          <div className="space-y-4">
            <h4 className="font-medium">카테고리 필터</h4>

            <div className="space-y-2">
              <Label>대분류</Label>
              <Select
                value={localFilters.majorCategory || ""}
                onValueChange={(value) => updateFilter("majorCategory", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.majorCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>중분류</Label>
              <Select
                value={localFilters.middleCategory || ""}
                onValueChange={(value) => updateFilter("middleCategory", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.middleCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>소분류</Label>
              <Select
                value={localFilters.minorCategory || ""}
                onValueChange={(value) => updateFilter("minorCategory", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.minorCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Level Filters */}
          <div className="space-y-4">
            <h4 className="font-medium">분류 체계</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>0차</Label>
                <Select
                  value={localFilters.level0 || ""}
                  onValueChange={(value) => updateFilter("level0", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.level0.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>1차</Label>
                <Select
                  value={localFilters.level1 || ""}
                  onValueChange={(value) => updateFilter("level1", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.level1.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status and Category */}
          <div className="space-y-4">
            <h4 className="font-medium">상태 및 구분</h4>

            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={localFilters.status?.[0] || ""}
                onValueChange={(value) => updateFilter("status", value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>구분</Label>
              <Select
                value={localFilters.category?.[0] || ""}
                onValueChange={(value) => updateFilter("category", value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>개발연도</Label>
              <Select
                value={localFilters.developmentYear || ""}
                onValueChange={(value) => updateFilter("developmentYear", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filters.developmentYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Range Filters */}
          <div className="space-y-4">
            <h4 className="font-medium">범위 필터</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  교육비 범위: {localFilters.minEducationFee || filters.educationFeeRange.min}원 -{" "}
                  {localFilters.maxEducationFee || filters.educationFeeRange.max}원
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="최소"
                    value={localFilters.minEducationFee || ""}
                    onChange={(e) =>
                      updateFilter("minEducationFee", e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                  <Input
                    type="number"
                    placeholder="최대"
                    value={localFilters.maxEducationFee || ""}
                    onChange={(e) =>
                      updateFilter("maxEducationFee", e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  차시 범위: {localFilters.minSessions || filters.sessionsRange.min} -{" "}
                  {localFilters.maxSessions || filters.sessionsRange.max}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="최소"
                    value={localFilters.minSessions || ""}
                    onChange={(e) =>
                      updateFilter("minSessions", e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                  <Input
                    type="number"
                    placeholder="최대"
                    value={localFilters.maxSessions || ""}
                    onChange={(e) =>
                      updateFilter("maxSessions", e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setLocalFilters({})
                onReset()
                setOpen(false)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              초기화
            </Button>
            <Button className="flex-1" onClick={applyFilters}>
              적용
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

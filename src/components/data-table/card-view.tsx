"use client"

import * as React from "react"
import { Content } from "./columns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Eye, Edit, Trash } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface CardViewProps {
  data: Content[]
  isLoading?: boolean
  onView: (content: Content) => void
  onEdit: (content: Content) => void
  onDelete: (content: Content) => void
  selectedIds?: number[]
  onSelectChange?: (id: number, selected: boolean) => void
}

export function CardView({
  data,
  isLoading,
  onView,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectChange,
}: CardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg font-medium">데이터가 없습니다</p>
        <p className="text-sm mt-1">필터 조건을 변경하거나 새 콘텐츠를 추가해보세요</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((content) => (
        <div
          key={content.id}
          className="group relative border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 bg-white dark:bg-slate-800"
        >
          {/* Selection Checkbox */}
          {onSelectChange && (
            <div className="absolute top-4 left-4">
              <Checkbox
                checked={selectedIds.includes(content.id)}
                onCheckedChange={(checked) => onSelectChange(content.id, !!checked)}
                aria-label="Select card"
              />
            </div>
          )}

          {/* Actions Menu */}
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(content)}>
                  <Eye className="mr-2 h-4 w-4" />
                  상세 보기
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(content)}>
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(content)} className="text-red-600">
                  <Trash className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="space-y-4 mt-8">
            {/* Category Badge */}
            <div className="flex gap-2">
              <Badge variant="outline">{content.category}</Badge>
              {content.status && (
                <Badge variant={content.status === "완료" ? "default" : "secondary"}>
                  {content.status}
                </Badge>
              )}
            </div>

            {/* Course Name */}
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {content.courseName}
            </h3>

            {/* Categories */}
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <p><span className="font-medium">대분류:</span> {content.majorCategory}</p>
              <p><span className="font-medium">중분류:</span> {content.middleCategory}</p>
              {content.minorCategory && (
                <p><span className="font-medium">소분류:</span> {content.minorCategory}</p>
              )}
            </div>

            {/* Stats */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">차시</p>
                <p className="font-semibold">{content.sessions}차시</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">교육비</p>
                <p className="font-semibold">
                  {new Intl.NumberFormat("ko-KR", {
                    style: "currency",
                    currency: "KRW",
                  }).format(content.educationFee)}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            {content.developmentYear && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                개발연도: {content.developmentYear}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

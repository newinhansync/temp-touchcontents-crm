"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  field: string
  onSearch: (value: string, field: string) => void
}

export function SearchBar({ value, field, onSearch }: SearchBarProps) {
  const [searchValue, setSearchValue] = React.useState(value)
  const [searchField, setSearchField] = React.useState(field)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchValue, searchField)
  }

  const handleFieldChange = (newField: string) => {
    setSearchField(newField)
    if (searchValue) {
      onSearch(searchValue, newField)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Select value={searchField} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="검색 대상" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="courseName">과정명</SelectItem>
          <SelectItem value="courseIntro">과정소개</SelectItem>
          <SelectItem value="sme">SME</SelectItem>
          <SelectItem value="learningObjective">학습목표</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="검색어를 입력하세요..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10"
        />
      </div>
    </form>
  )
}

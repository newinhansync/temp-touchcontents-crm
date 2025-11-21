export interface ContentFilters {
  majorCategory?: string
  middleCategory?: string
  minorCategory?: string
  level0?: string
  level1?: string
  level2?: string
  level3?: string
  status?: string[]
  category?: string[]
  developmentYear?: string
  turnkeyAvailable?: string
  search?: string
  searchField?: 'courseName' | 'courseIntro' | 'sme' | 'learningObjective' | 'all'
  minEducationFee?: number
  maxEducationFee?: number
  minSessions?: number
  maxSessions?: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface ContentListResponse {
  data: any[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface FilterOptions {
  majorCategories: string[]
  middleCategories: string[]
  minorCategories: string[]
  level0: string[]
  level1: string[]
  level2: string[]
  level3: string[]
  statuses: string[]
  categories: string[]
  developmentYears: string[]
  turnkeyOptions: string[]
  educationFeeRange: { min: number; max: number }
  sessionsRange: { min: number; max: number }
}

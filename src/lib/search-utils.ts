import { CollectedInfo } from './prompts/system'

/**
 * 사용자 요구사항을 스마트 검색 쿼리로 변환
 * 콘텐츠의 학습목표, 학습대상과 매칭하기 위한 구조화된 검색 쿼리 생성
 */
export function buildSmartSearchQuery(collectedInfo: CollectedInfo): string {
  const parts: string[] = []

  // 1. 학습 목표 (가장 중요 - 콘텐츠의 learningObjective와 매칭)
  if (collectedInfo.learningGoal) {
    parts.push(`학습목표: ${collectedInfo.learningGoal}`)
  }

  // 2. 대상 정보 조합 (콘텐츠의 targetAudience와 매칭)
  const targetParts: string[] = []
  if (collectedInfo.targetGroup) targetParts.push(collectedInfo.targetGroup)
  if (collectedInfo.jobLevel) targetParts.push(collectedInfo.jobLevel)
  if (collectedInfo.skillLevel) targetParts.push(`${collectedInfo.skillLevel} 수준`)

  if (targetParts.length > 0) {
    parts.push(`학습대상: ${targetParts.join(' ')}`)
  }

  // 3. 산업/분야 (콘텐츠의 카테고리와 매칭)
  if (collectedInfo.industry) {
    parts.push(`산업분야: ${collectedInfo.industry}`)
  }

  // 4. 추가 컨텍스트
  if (collectedInfo.company) {
    parts.push(`기업: ${collectedInfo.company}`)
  }

  return parts.join('\n')
}

/**
 * 사용자 요구사항에서 키워드 추출
 * 학습목표에서 핵심 기술/스킬 키워드 추출
 */
export function extractKeywords(collectedInfo: CollectedInfo): string[] {
  const keywords: string[] = []

  if (collectedInfo.learningGoal) {
    // 일반적인 기술 키워드 패턴
    const techPatterns = [
      /react/gi, /vue/gi, /angular/gi, /javascript/gi, /typescript/gi,
      /python/gi, /java/gi, /node/gi, /spring/gi, /django/gi,
      /aws/gi, /azure/gi, /gcp/gi, /docker/gi, /kubernetes/gi,
      /ai/gi, /ml/gi, /데이터/gi, /머신러닝/gi, /딥러닝/gi,
      /프론트엔드/gi, /백엔드/gi, /풀스택/gi, /devops/gi,
      /리더십/gi, /커뮤니케이션/gi, /프로젝트/gi, /관리/gi,
      /마케팅/gi, /영업/gi, /기획/gi, /디자인/gi, /ux/gi, /ui/gi
    ]

    techPatterns.forEach(pattern => {
      const matches = collectedInfo.learningGoal?.match(pattern)
      if (matches) {
        keywords.push(...matches.map(m => m.toLowerCase()))
      }
    })
  }

  // 직군 기반 키워드 추가
  if (collectedInfo.targetGroup) {
    keywords.push(collectedInfo.targetGroup.toLowerCase())
  }

  // 중복 제거
  return Array.from(new Set(keywords))
}

/**
 * 검색 결과 필터링 조건 생성
 */
export interface SearchFilters {
  maxPrice?: number
  minSessions?: number
  maxSessions?: number
  categories?: string[]
  developmentYears?: string[]
  skillLevels?: string[]
}

export function buildSearchFilters(collectedInfo: CollectedInfo): SearchFilters {
  const filters: SearchFilters = {}

  // 교육 기간 기반 차시 필터
  if (collectedInfo.duration) {
    const durationMatch = collectedInfo.duration.match(/(\d+)\s*(주|개월|달)/i)
    if (durationMatch) {
      const value = parseInt(durationMatch[1], 10)
      const unit = durationMatch[2]

      // 주당 5차시, 월당 20차시 기준
      if (unit === '주') {
        filters.maxSessions = value * 5 * 2 // 여유 있게 2배
        filters.minSessions = Math.max(1, value * 2)
      } else {
        filters.maxSessions = value * 20 * 2
        filters.minSessions = Math.max(1, value * 5)
      }
    }
  }

  // 최신 콘텐츠 우선 (2022년 이후)
  const currentYear = new Date().getFullYear()
  filters.developmentYears = [
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
    String(currentYear - 3)
  ]

  return filters
}

/**
 * 콘텐츠가 필터 조건을 만족하는지 확인
 */
export function matchesFilters(
  content: {
    educationFee: number
    sessions: number
    developmentYear?: string | null
  },
  filters: SearchFilters
): boolean {
  // 가격 필터
  if (filters.maxPrice && content.educationFee > filters.maxPrice) {
    return false
  }

  // 차시 필터
  if (filters.minSessions && content.sessions < filters.minSessions) {
    return false
  }
  if (filters.maxSessions && content.sessions > filters.maxSessions) {
    return false
  }

  return true
}

/**
 * 추천 결과 요약 생성
 */
export function generateRecommendationSummary(
  contents: Array<{ educationFee: number; sessions: number; developmentYear?: string | null }>
): {
  totalFee: number
  totalSessions: number
  averageFee: number
  latestContentRatio: string
} {
  const totalFee = contents.reduce((sum, c) => sum + c.educationFee, 0)
  const totalSessions = contents.reduce((sum, c) => sum + c.sessions, 0)
  const averageFee = contents.length > 0 ? Math.round(totalFee / contents.length) : 0

  // 최신 콘텐츠 비율 (2023년 이후)
  const currentYear = new Date().getFullYear()
  const recentContents = contents.filter(c => {
    const year = parseInt(c.developmentYear || '0', 10)
    return year >= currentYear - 1
  })
  const latestRatio = contents.length > 0
    ? Math.round((recentContents.length / contents.length) * 100)
    : 0
  const latestContentRatio = `${latestRatio}%가 ${currentYear - 1}-${currentYear}년 개발`

  return {
    totalFee,
    totalSessions,
    averageFee,
    latestContentRatio
  }
}

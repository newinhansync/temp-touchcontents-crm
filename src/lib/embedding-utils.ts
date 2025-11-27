import { Content } from '@prisma/client'

/**
 * 콘텐츠의 모든 관련 정보를 포함한 텍스트 생성
 * 임베딩 품질 향상을 위해 과정상세, 학습목표, 학습대상 등 핵심 필드 포함
 */
export function generateContentText(content: Content): string {
  const parts: string[] = []

  // 1. 기본 정보
  parts.push(`과정명: ${content.courseName}`)
  parts.push(`카테고리: ${content.majorCategory} > ${content.middleCategory} > ${content.minorCategory}`)

  // 2. 과정 상세 (핵심!)
  if (content.courseIntro) {
    parts.push(`과정소개: ${content.courseIntro}`)
  }

  // 3. 학습목표 (매우 중요!)
  if (content.learningObjective) {
    parts.push(`학습목표: ${content.learningObjective}`)
  }

  // 4. 학습대상 (매칭에 핵심!)
  if (content.targetAudience) {
    parts.push(`학습대상: ${content.targetAudience}`)
  }

  // 5. 학습내용/커리큘럼 (구체적 매칭!)
  if (content.curriculum) {
    const curriculumText = formatCurriculum(content.curriculum)
    if (curriculumText && curriculumText !== '없음') {
      parts.push(`학습내용: ${curriculumText}`)
    }
  }

  // 6. 세부내용
  if (content.detailContent) {
    parts.push(`세부내용: ${content.detailContent}`)
  }

  // 7. 난이도 레벨 체계
  const levels = [content.level0, content.level1, content.level2, content.level3]
    .filter(Boolean)
    .join(' > ')
  if (levels) {
    parts.push(`난이도: ${levels}`)
  }

  // 8. 메타 정보
  parts.push(`차시: ${content.sessions}차시`)
  parts.push(`교육비: ${content.educationFee}원`)

  if (content.developmentYear) {
    parts.push(`개발연도: ${content.developmentYear}`)
  }

  return parts.join('\n')
}

/**
 * 커리큘럼 데이터를 텍스트로 변환
 */
export function formatCurriculum(curriculum: unknown): string {
  if (!curriculum) return '없음'

  if (Array.isArray(curriculum)) {
    const items = curriculum.slice(0, 10) // 최대 10개 항목
    const text = items.join(', ')
    return curriculum.length > 10 ? `${text}...` : text
  }

  if (typeof curriculum === 'object') {
    try {
      const text = JSON.stringify(curriculum)
      return text.length > 300 ? text.slice(0, 300) + '...' : text
    } catch {
      return '없음'
    }
  }

  if (typeof curriculum === 'string') {
    return curriculum.length > 300 ? curriculum.slice(0, 300) + '...' : curriculum
  }

  return '없음'
}

/**
 * 콘텐츠 정보를 AI 프롬프트용 포맷으로 변환
 * 추천 시 AI가 더 정확한 매칭을 할 수 있도록 상세 정보 포함
 */
export function formatContentForPrompt(content: Content, index: number, scores?: {
  similarity?: number
  recencyScore?: number
  totalScore?: number
}): string {
  const lines = [
    `[${index + 1}] ${content.courseName}`,
    `- ID: ${content.id}`,
    `- 카테고리: ${content.majorCategory} > ${content.middleCategory} > ${content.minorCategory}`,
    `- 차시: ${content.sessions}`,
    `- 교육비: ${content.educationFee}원`,
    `- 개발연도: ${content.developmentYear || '미상'}`,
  ]

  // 점수 정보가 있으면 추가
  if (scores) {
    if (scores.similarity !== undefined) {
      lines.push(`- 유사도점수: ${(scores.similarity * 100).toFixed(1)}%`)
    }
    if (scores.recencyScore !== undefined) {
      lines.push(`- 최신성점수: ${(scores.recencyScore * 100).toFixed(1)}%`)
    }
  }

  // 핵심 상세 정보
  lines.push(`- 과정소개: ${content.courseIntro || '없음'}`)
  lines.push(`- 학습목표: ${content.learningObjective || '없음'}`)
  lines.push(`- 학습대상: ${content.targetAudience || '없음'}`)
  lines.push(`- 학습내용: ${formatCurriculum(content.curriculum)}`)

  return lines.join('\n')
}

/**
 * 최신성 점수 계산
 * 2024년 = 1.0, 2023년 = 0.9, 2022년 = 0.8, ...
 */
export function calculateRecencyScore(developmentYear: string | null | undefined): number {
  if (!developmentYear) return 0.5 // 연도 정보 없으면 중간값

  const currentYear = new Date().getFullYear()
  const devYear = parseInt(developmentYear, 10)

  if (isNaN(devYear)) return 0.5

  // 최신 콘텐츠일수록 높은 점수 (최대 1.0)
  const yearDiff = currentYear - devYear
  return Math.max(0, 1 - yearDiff * 0.1)
}

/**
 * 종합 점수 계산
 * 유사도 60% + 최신성 40%
 */
export function calculateTotalScore(
  similarity: number,
  recencyScore: number
): number {
  return (similarity * 0.6) + (recencyScore * 0.4)
}

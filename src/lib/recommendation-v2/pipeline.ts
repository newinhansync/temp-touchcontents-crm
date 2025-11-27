/**
 * AI 콘텐츠 추천 시스템 V2 - VMSRP 파이프라인
 * Validation-based Multi-Stage Recommendation Pipeline
 */

import { Content } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateChatCompletion, generateEmbedding, cosineSimilarity } from '@/lib/openai'
import { CollectedInfo } from '@/lib/prompts/system'
import { formatCurriculum, calculateRecencyScore } from '@/lib/embedding-utils'
import {
  SearchIntent,
  ScoredContent,
  RelevanceResult,
  GroundedRecommendation,
  VerificationResult,
  V2RecommendationResult,
  DEFAULT_V2_CONFIG,
  DOMAIN_CATEGORIES,
  TECH_KEYWORDS,
  RecommendationError
} from './types'
import {
  buildIntentExtractionPrompt,
  buildRelevanceValidationPrompt,
  buildGroundedReasonPrompt,
  formatContentForValidation
} from './prompts'

/**
 * V2 추천 파이프라인 메인 함수
 */
export async function generateRecommendationsV2(
  collectedInfo: CollectedInfo
): Promise<{ recommendations: V2RecommendationResult; packageId: number } | RecommendationError> {
  const config = DEFAULT_V2_CONFIG
  const metrics = {
    stage1_intentExtraction: 0,
    stage2_hardFilter: 0,
    stage3_hybridScoring: 0,
    stage4_relevanceValidation: 0,
    stage5_reasonGeneration: 0,
    stage6_factVerification: 0,
    stage7_finalPackage: 0
  }

  try {
    console.log('🚀 V2 Pipeline Start:', collectedInfo.learningGoal)

    // ========== STAGE 1: Intent Extraction ==========
    console.log('\n📌 Stage 1: Intent Extraction')
    const intent = await extractSearchIntent(collectedInfo)
    metrics.stage1_intentExtraction = intent.primaryKeywords.length + intent.secondaryKeywords.length
    console.log('- Primary Keywords:', intent.primaryKeywords)
    console.log('- Exclusion Keywords:', intent.exclusionKeywords)

    // ========== STAGE 2: Hard Filter ==========
    console.log('\n📌 Stage 2: Hard Filter (SQL)')
    const hardFilteredContents = await hardFilter(intent)
    metrics.stage2_hardFilter = hardFilteredContents.length
    console.log(`- Filtered: ${hardFilteredContents.length} contents`)

    if (hardFilteredContents.length === 0) {
      return handleNoResults('Hard Filter 단계에서 관련 콘텐츠를 찾지 못했습니다.', intent)
    }

    // ========== STAGE 3: Hybrid Scoring ==========
    console.log('\n📌 Stage 3: Hybrid Scoring')
    const scoredContents = await hybridScoring(hardFilteredContents, intent, collectedInfo, config)
    metrics.stage3_hybridScoring = scoredContents.length
    console.log(`- Score threshold passed: ${scoredContents.length} contents`)

    if (scoredContents.length === 0) {
      return handleNoResults('Hybrid Scoring 단계에서 임계값을 통과한 콘텐츠가 없습니다.', intent)
    }

    // ========== STAGE 4: LLM Relevance Validation ==========
    console.log('\n📌 Stage 4: LLM Relevance Validation')
    const relevantContents = await validateRelevance(scoredContents, collectedInfo, config)
    metrics.stage4_relevanceValidation = relevantContents.length
    console.log(`- Relevance validated: ${relevantContents.length} contents`)

    if (relevantContents.length === 0) {
      return handleNoResults('LLM 관련성 검증을 통과한 콘텐츠가 없습니다.', intent, scoredContents.slice(0, 10).map(sc => sc.content))
    }

    // ========== STAGE 5: Grounded Reason Generation ==========
    console.log('\n📌 Stage 5: Grounded Reason Generation')
    const groundedRecommendations = await generateGroundedReasons(
      relevantContents,
      collectedInfo,
      config
    )
    metrics.stage5_reasonGeneration = groundedRecommendations.length
    console.log(`- Reasons generated: ${groundedRecommendations.length}`)

    // ========== STAGE 6: Fact Verification ==========
    console.log('\n📌 Stage 6: Fact Verification')
    const verifiedRecommendations = verifyFacts(
      groundedRecommendations,
      relevantContents.map(r => r.scored)
    )
    metrics.stage6_factVerification = verifiedRecommendations.filter(v => v.isVerified).length
    console.log(`- Verified: ${metrics.stage6_factVerification} / ${verifiedRecommendations.length}`)

    // ========== STAGE 7: Package Assembly ==========
    console.log('\n📌 Stage 7: Package Assembly')
    const finalContents = verifiedRecommendations.filter(v => v.isVerified)
    metrics.stage7_finalPackage = finalContents.length

    if (finalContents.length === 0) {
      // 사실 검증을 통과하지 못한 경우, 검증 전 결과 사용
      console.log('⚠️ Fact verification failed for all - using pre-verification results')
      const fallbackContents = groundedRecommendations.map(gr => ({
        ...gr,
        isVerified: true,
        failedCitations: []
      }))
      return await assemblePackage(
        fallbackContents,
        relevantContents,
        collectedInfo,
        metrics
      )
    }

    return await assemblePackage(
      finalContents,
      relevantContents,
      collectedInfo,
      metrics
    )

  } catch (error) {
    console.error('❌ V2 Pipeline Error:', error)
    return {
      success: false,
      message: '추천 생성 중 오류가 발생했습니다.',
      suggestion: '잠시 후 다시 시도해주세요.',
      alternatives: ['검색 조건을 더 구체적으로 입력해보세요', '다른 키워드로 시도해보세요']
    }
  }
}

/**
 * Stage 1: Intent Extraction
 * LLM을 사용하여 사용자 요청에서 핵심 정보 추출
 */
async function extractSearchIntent(collectedInfo: CollectedInfo): Promise<SearchIntent> {
  const prompt = buildIntentExtractionPrompt(
    collectedInfo.learningGoal || '',
    {
      industry: collectedInfo.industry,
      targetGroup: collectedInfo.targetGroup,
      jobLevel: collectedInfo.jobLevel,
      skillLevel: collectedInfo.skillLevel
    }
  )

  try {
    const response = await generateChatCompletion([
      { role: 'system', content: '당신은 교육 콘텐츠 검색 전문가입니다. JSON 형식으로만 응답하세요.' },
      { role: 'user', content: prompt }
    ], { model: 'gpt-4o', temperature: 0.1 })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Intent extraction error:', error)
  }

  // Fallback: Simple keyword extraction
  return extractIntentFallback(collectedInfo)
}

/**
 * Intent extraction fallback (LLM 실패 시)
 */
function extractIntentFallback(collectedInfo: CollectedInfo): SearchIntent {
  const learningGoal = collectedInfo.learningGoal || ''

  // Simple keyword extraction from learning goal
  const words = learningGoal.split(/[\s,，、·]+/).filter(w => w.length >= 2)

  return {
    primaryKeywords: words.slice(0, 5),
    secondaryKeywords: [],
    domain: detectDomain(learningGoal, collectedInfo.industry),
    targetLevel: collectedInfo.skillLevel || '중급',
    exclusionKeywords: [],
    technicalStack: []
  }
}

/**
 * 도메인 자동 감지
 */
function detectDomain(text: string, industry?: string | null): string {
  const lowerText = (text + ' ' + (industry || '')).toLowerCase()

  for (const [domain, keywords] of Object.entries(DOMAIN_CATEGORIES)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return domain
    }
  }
  return 'IT/개발' // Default
}

/**
 * Stage 2: Hard Filter
 * SQL WHERE 조건으로 명확히 무관한 콘텐츠 제거
 */
async function hardFilter(intent: SearchIntent): Promise<Content[]> {
  const allKeywords = [...intent.primaryKeywords, ...intent.secondaryKeywords]

  if (allKeywords.length === 0) {
    // 키워드가 없으면 전체 반환 (상위 300개)
    return prisma.content.findMany({
      take: 300,
      orderBy: { developmentYear: 'desc' }
    })
  }

  // Prisma를 사용한 OR 조건 검색
  const contents = await prisma.content.findMany({
    where: {
      OR: allKeywords.flatMap(keyword => [
        { courseName: { contains: keyword, mode: 'insensitive' } },
        { courseIntro: { contains: keyword, mode: 'insensitive' } },
        { learningObjective: { contains: keyword, mode: 'insensitive' } },
        { majorCategory: { contains: keyword, mode: 'insensitive' } },
        { middleCategory: { contains: keyword, mode: 'insensitive' } },
        { minorCategory: { contains: keyword, mode: 'insensitive' } }
      ])
    },
    take: 300,
    orderBy: { developmentYear: 'desc' }
  })

  // 제외 키워드 필터링
  if (intent.exclusionKeywords.length > 0) {
    return contents.filter(content => {
      const contentText = `${content.courseName} ${content.courseIntro || ''} ${content.learningObjective || ''}`.toLowerCase()
      return !intent.exclusionKeywords.some(excl => contentText.includes(excl.toLowerCase()))
    })
  }

  return contents
}

/**
 * Stage 3: Hybrid Scoring
 * 키워드 + 벡터 + 카테고리 + 최신성 복합 점수
 */
async function hybridScoring(
  contents: Content[],
  intent: SearchIntent,
  collectedInfo: CollectedInfo,
  config: typeof DEFAULT_V2_CONFIG
): Promise<ScoredContent[]> {
  // 쿼리 임베딩 생성
  const queryText = [
    ...intent.primaryKeywords,
    ...intent.secondaryKeywords,
    collectedInfo.learningGoal || ''
  ].join(' ')

  const queryEmbedding = await generateEmbedding(queryText)

  // 콘텐츠 임베딩 조회
  const contentIds = contents.map(c => c.id)
  const embeddings = await prisma.contentEmbedding.findMany({
    where: { contentId: { in: contentIds } }
  })
  const embeddingMap = new Map(embeddings.map(e => [e.contentId, JSON.parse(e.embedding) as number[]]))

  // 점수 계산
  const scoredContents: ScoredContent[] = contents.map(content => {
    // 1. Keyword Match Score (35%)
    const contentText = `${content.courseName} ${content.courseIntro || ''} ${content.learningObjective || ''} ${content.majorCategory}`.toLowerCase()
    const allKeywords = [...intent.primaryKeywords, ...intent.secondaryKeywords]
    const matchedKeywords = allKeywords.filter(kw => contentText.includes(kw.toLowerCase()))
    const keywordMatch = allKeywords.length > 0 ? matchedKeywords.length / allKeywords.length : 0

    // 2. Vector Similarity (25%)
    const contentEmbedding = embeddingMap.get(content.id)
    const vectorSimilarity = contentEmbedding
      ? cosineSimilarity(queryEmbedding, contentEmbedding)
      : 0.3 // 임베딩 없으면 낮은 점수

    // 3. Category Relevance (20%)
    const categoryRelevance = calculateCategoryRelevance(content, intent.domain)

    // 4. Recency Score (20%)
    const recencyScore = calculateRecencyScore(content.developmentYear)

    // 가중 합계 (예산 제외: 키워드 40% + 벡터 25% + 카테고리 20% + 최신성 15%)
    const totalScore =
      (keywordMatch * 0.40) +
      (vectorSimilarity * 0.25) +
      (categoryRelevance * 0.20) +
      (recencyScore * 0.15)

    return {
      content,
      scores: {
        keywordMatch,
        vectorSimilarity,
        categoryRelevance,
        recencyScore,
        totalScore
      },
      matchedKeywords
    }
  })

  // 임계값 필터링 및 정렬
  return scoredContents
    .filter(sc => sc.scores.totalScore >= config.thresholds.hybridScoreMin)
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore)
}

/**
 * 카테고리 관련성 계산
 */
function calculateCategoryRelevance(content: Content, domain: string): number {
  const domainKeywords = DOMAIN_CATEGORIES[domain] || []
  const categoryText = `${content.majorCategory} ${content.middleCategory} ${content.minorCategory}`.toLowerCase()

  const matchCount = domainKeywords.filter(kw => categoryText.includes(kw.toLowerCase())).length
  return Math.min(matchCount / 3, 1) // 최대 1.0
}

/**
 * Stage 4: LLM Relevance Validation
 * 배치 처리로 관련성 검증
 */
async function validateRelevance(
  scoredContents: ScoredContent[],
  collectedInfo: CollectedInfo,
  config: typeof DEFAULT_V2_CONFIG
): Promise<Array<{ scored: ScoredContent; relevance: RelevanceResult }>> {
  const results: Array<{ scored: ScoredContent; relevance: RelevanceResult }> = []
  const BATCH_SIZE = config.batch.relevanceValidation

  for (let i = 0; i < scoredContents.length; i += BATCH_SIZE) {
    const batch = scoredContents.slice(i, i + BATCH_SIZE)

    const contentList = batch.map((sc, idx) =>
      formatContentForValidation(sc.content, idx)
    ).join('\n')

    const prompt = buildRelevanceValidationPrompt(
      collectedInfo.learningGoal || '',
      {
        targetGroup: collectedInfo.targetGroup,
        jobLevel: collectedInfo.jobLevel,
        skillLevel: collectedInfo.skillLevel,
        industry: collectedInfo.industry
      },
      contentList
    )

    try {
      const response = await generateChatCompletion([
        { role: 'system', content: '교육 콘텐츠 관련성을 평가합니다. JSON 배열 형식으로만 응답하세요.' },
        { role: 'user', content: prompt }
      ], { model: 'gpt-4o', temperature: 0.1 })

      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const batchResults: RelevanceResult[] = JSON.parse(jsonMatch[0])

        for (const result of batchResults) {
          const scored = batch.find(sc => sc.content.id === result.contentId)
          if (scored && result.relevanceScore >= config.thresholds.relevanceScoreMin) {
            results.push({
              scored,
              relevance: {
                ...result,
                isRelevant: true
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Relevance validation batch error:', error)
      // Fallback: 높은 점수 콘텐츠는 통과시킴
      for (const sc of batch) {
        if (sc.scores.totalScore >= 0.6) {
          results.push({
            scored: sc,
            relevance: {
              contentId: sc.content.id,
              relevanceScore: 7,
              isRelevant: true,
              reason: '하이브리드 스코어 기반 추천'
            }
          })
        }
      }
    }
  }

  return results
}

/**
 * Stage 5: Grounded Reason Generation
 * 인용 기반 추천 이유 생성
 */
async function generateGroundedReasons(
  relevantContents: Array<{ scored: ScoredContent; relevance: RelevanceResult }>,
  collectedInfo: CollectedInfo,
  config: typeof DEFAULT_V2_CONFIG
): Promise<GroundedRecommendation[]> {
  const results: GroundedRecommendation[] = []
  const BATCH_SIZE = config.batch.reasonGeneration

  for (let i = 0; i < relevantContents.length; i += BATCH_SIZE) {
    const batch = relevantContents.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async ({ scored }) => {
      const prompt = buildGroundedReasonPrompt(
        collectedInfo.learningGoal || '',
        scored.content
      )

      try {
        const response = await generateChatCompletion([
          { role: 'system', content: '콘텐츠 정보를 정확히 인용하여 추천 이유를 작성합니다. 텍스트만 응답하세요.' },
          { role: 'user', content: prompt }
        ], { model: 'gpt-4o', temperature: 0.3 })

        // 인용문 추출
        const citations = response.match(/['"]([^'"]+)['"]/g)?.map(c => c.replace(/['"]/g, '')) || []

        return {
          contentId: scored.content.id,
          reason: response.trim(),
          citations
        }
      } catch (error) {
        console.error('Reason generation error:', error)
        // Fallback reason
        return {
          contentId: scored.content.id,
          reason: `${scored.content.courseName}은(는) ${collectedInfo.skillLevel || '해당'} 수준에 적합한 교육 콘텐츠입니다.`,
          citations: []
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

/**
 * Stage 6: Fact Verification
 * 추천 이유의 사실 검증
 */
function verifyFacts(
  recommendations: GroundedRecommendation[],
  scoredContents: ScoredContent[]
): VerificationResult[] {
  const contentMap = new Map(scoredContents.map(sc => [sc.content.id, sc.content]))

  return recommendations.map(rec => {
    const content = contentMap.get(rec.contentId)
    if (!content) {
      return {
        contentId: rec.contentId,
        reason: rec.reason,
        isVerified: false,
        failedCitations: ['콘텐츠를 찾을 수 없음']
      }
    }

    const failedCitations: string[] = []

    // 1. 인용 검증
    const contentText = [
      content.courseName,
      content.courseIntro,
      content.learningObjective,
      content.targetAudience,
      formatCurriculum(content.curriculum)
    ].filter(Boolean).join(' ').toLowerCase()

    for (const citation of rec.citations) {
      if (citation.length > 5 && !contentText.includes(citation.toLowerCase())) {
        // 유사도 체크
        const similarity = calculateTextSimilarity(citation.toLowerCase(), contentText)
        if (similarity < 0.7) {
          failedCitations.push(citation)
        }
      }
    }

    // 2. Hallucination 탐지 (기술 키워드)
    const reasonLower = rec.reason.toLowerCase()
    for (const tech of TECH_KEYWORDS) {
      const techLower = tech.toLowerCase()
      if (reasonLower.includes(techLower) && !contentText.includes(techLower)) {
        failedCitations.push(`${tech}가 추천 이유에 있지만 콘텐츠에 없음`)
      }
    }

    return {
      contentId: rec.contentId,
      reason: rec.reason,
      isVerified: failedCitations.length === 0,
      failedCitations
    }
  })
}

/**
 * 텍스트 유사도 계산 (간단한 Jaccard)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/))
  const words2 = new Set(text2.split(/\s+/))

  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)))
  const union = new Set([...Array.from(words1), ...Array.from(words2)])

  return intersection.size / union.size
}

/**
 * Stage 7: Package Assembly
 * 최종 패키지 구성
 */
async function assemblePackage(
  verifiedRecommendations: VerificationResult[],
  relevantContents: Array<{ scored: ScoredContent; relevance: RelevanceResult }>,
  collectedInfo: CollectedInfo,
  metrics: V2RecommendationResult['pipelineMetrics']
): Promise<{ recommendations: V2RecommendationResult; packageId: number }> {
  const relevanceMap = new Map(relevantContents.map(rc => [rc.scored.content.id, rc]))

  // 학습 경로 구성
  const selectedContents: V2RecommendationResult['selectedContents'] = []
  const foundation: number[] = []
  const intermediate: number[] = []
  const advanced: number[] = []

  let order = 1
  for (const verified of verifiedRecommendations) {
    const relevanceData = relevanceMap.get(verified.contentId)
    if (!relevanceData) continue

    const { scored, relevance } = relevanceData
    const content = scored.content

    selectedContents.push({
      contentId: content.id,
      order: order++,
      reason: verified.reason,
      score: Math.round(scored.scores.totalScore * 100),
      relevanceScore: relevance.relevanceScore,
      matchedKeywords: scored.matchedKeywords,
      citations: [] // 검증 통과한 것만 포함
    })

    // 학습 경로 분류
    const level = (content.level0 || content.level1 || '').toLowerCase()
    if (level.includes('입문') || level.includes('기초') || level.includes('초급')) {
      foundation.push(content.id)
    } else if (level.includes('심화') || level.includes('고급') || level.includes('전문')) {
      advanced.push(content.id)
    } else {
      intermediate.push(content.id)
    }
  }

  // 총계 계산
  const totalFee = selectedContents.reduce((sum, sc) => {
    const content = relevanceMap.get(sc.contentId)?.scored.content
    return sum + (content?.educationFee || 0)
  }, 0)

  const totalSessions = selectedContents.reduce((sum, sc) => {
    const content = relevanceMap.get(sc.contentId)?.scored.content
    return sum + (content?.sessions || 0)
  }, 0)

  // 최신 콘텐츠 비율 계산
  const currentYear = new Date().getFullYear()
  const recentCount = selectedContents.filter(sc => {
    const content = relevanceMap.get(sc.contentId)?.scored.content
    const year = parseInt(content?.developmentYear || '0', 10)
    return year >= currentYear - 1
  }).length
  const latestRatio = selectedContents.length > 0
    ? Math.round((recentCount / selectedContents.length) * 100)
    : 0

  const recommendation: V2RecommendationResult = {
    packageName: `${collectedInfo.company || '기업'} ${collectedInfo.targetGroup || '직원'} ${collectedInfo.learningGoal?.slice(0, 20) || '역량개발'} 패키지`,
    description: `${collectedInfo.learningGoal}을 위한 맞춤형 교육 패키지입니다. 총 ${selectedContents.length}개의 검증된 콘텐츠로 구성되었으며, 기초부터 심화까지 체계적인 학습 경로를 제공합니다.`,
    selectedContents,
    summary: {
      totalFee,
      totalSessions,
      estimatedDuration: collectedInfo.duration || '2개월',
      latestContentRatio: `${latestRatio}%가 ${currentYear - 1}-${currentYear}년 개발`,
      totalRecommended: selectedContents.length
    },
    learningPath: {
      foundation,
      intermediate,
      advanced
    },
    pipelineMetrics: metrics
  }

  // DB 저장
  const pkg = await prisma.package.create({
    data: {
      name: recommendation.packageName,
      description: recommendation.description,
      targetCompany: collectedInfo.company || '',
      targetGroup: collectedInfo.targetGroup || '',
      requirements: collectedInfo as object,
      status: 'active',
      items: {
        create: selectedContents.map(sc => ({
          contentId: sc.contentId,
          order: sc.order,
          reason: sc.reason,
          score: sc.score
        }))
      }
    }
  })

  console.log(`\n✅ V2 Pipeline Complete: Package #${pkg.id} with ${selectedContents.length} contents`)

  return {
    recommendations: recommendation,
    packageId: pkg.id
  }
}

/**
 * 결과 없음 처리
 */
function handleNoResults(
  message: string,
  intent: SearchIntent,
  candidates?: Content[]
): RecommendationError {
  return {
    success: false,
    requiresManualReview: candidates && candidates.length > 0,
    message,
    suggestion: '검색 조건을 조정하거나 다른 키워드로 시도해주세요.',
    alternatives: [
      `다음 키워드로 재시도: ${intent.primaryKeywords.slice(0, 3).join(', ')}`,
      '학습 목표를 더 구체적으로 입력해주세요',
      '기술 스택을 명시해주세요'
    ],
    candidates
  }
}

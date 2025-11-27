import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion, generateEmbedding, cosineSimilarity } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import {
  SYSTEM_PROMPT,
  IMPROVED_RECOMMENDATION_PROMPT,
  ChatResponse,
  CollectedInfo,
  ImprovedRecommendationResult,
  isInfoComplete
} from '@/lib/prompts/system'
import { buildSmartSearchQuery } from '@/lib/search-utils'
import {
  formatCurriculum,
  calculateRecencyScore,
  calculateBudgetScore,
  calculateTotalScore
} from '@/lib/embedding-utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, conversationHistory = [], collectedInfo = {} } = body as {
      sessionId: string
      message: string
      conversationHistory?: Message[]
      collectedInfo?: Partial<CollectedInfo>
    }

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'sessionId와 message가 필요합니다.' },
        { status: 400 }
      )
    }

    // Initialize collected info with defaults
    const currentInfo: CollectedInfo = {
      company: collectedInfo.company ?? null,
      industry: collectedInfo.industry ?? null,
      employeeCount: collectedInfo.employeeCount ?? null,
      targetGroup: collectedInfo.targetGroup ?? null,
      jobLevel: collectedInfo.jobLevel ?? null,
      skillLevel: collectedInfo.skillLevel ?? null,
      learningGoal: collectedInfo.learningGoal ?? null,
      duration: collectedInfo.duration ?? null,
      budget: collectedInfo.budget ?? null
    }

    // Build conversation context for AI
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...(conversationHistory || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'user' as const,
        content: `사용자 메시지: "${message}"

현재까지 수집된 정보:
${JSON.stringify(currentInfo, null, 2)}

위 정보를 바탕으로 사용자 응답에서 정보를 추출하고, 아직 수집되지 않은 정보가 있다면 다음 질문을 생성하세요.
JSON 형식으로만 응답해주세요.`
      }
    ]

    const response = await generateChatCompletion(messages)

    let parsedResponse: ChatResponse
    try {
      // Extract JSON from response (handle cases where there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      console.error('Failed to parse AI response:', response)
      parsedResponse = {
        message: response,
        collectedInfo: collectedInfo as CollectedInfo,
        isComplete: false
      }
    }

    // Check if all required info is collected
    const complete = isInfoComplete(parsedResponse.collectedInfo)

    // If complete, generate recommendations
    let recommendations = null
    let packageId = null

    if (complete) {
      const result = await generateRecommendations(parsedResponse.collectedInfo)
      if (result) {
        recommendations = result.recommendations
        packageId = result.packageId
      }
    }

    return NextResponse.json({
      message: parsedResponse.message,
      collectedInfo: parsedResponse.collectedInfo,
      isComplete: complete,
      recommendations,
      packageId
    })
  } catch (error) {
    console.error('Chat message error:', error)
    return NextResponse.json(
      { error: '메시지 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

async function generateRecommendations(collectedInfo: CollectedInfo): Promise<{
  recommendations: ImprovedRecommendationResult
  packageId: number
} | null> {
  try {
    // 1. 스마트 검색 쿼리 생성 (개선된 방식)
    const searchQuery = buildSmartSearchQuery(collectedInfo)
    console.log('Smart search query:', searchQuery)

    // Generate embedding for search
    const queryEmbedding = await generateEmbedding(searchQuery)

    // 2. 모든 콘텐츠와 임베딩 조회
    const contentsWithEmbeddings = await prisma.contentEmbedding.findMany({
      include: {
        content: true
      }
    })

    // 3. 복합 스코어링 (유사도 + 최신성 + 예산적합성)
    const scoredContents = contentsWithEmbeddings
      .map(ce => {
        const embeddingArray = JSON.parse(ce.embedding) as number[]
        const similarity = cosineSimilarity(queryEmbedding, embeddingArray)

        // 최신성 점수 계산
        const recencyScore = calculateRecencyScore(ce.content.developmentYear)

        // 예산 적합성 점수 계산
        const budgetScore = calculateBudgetScore(ce.content.educationFee, collectedInfo.budget)

        // 종합 점수: 유사도 50% + 최신성 30% + 예산적합성 20%
        const totalScore = calculateTotalScore(similarity, recencyScore, budgetScore)

        return {
          content: ce.content,
          similarity,
          recencyScore,
          budgetScore,
          totalScore
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 60) // 상위 60개 후보 추출 (20-25개 선택을 위해)

    // 4. 임베딩이 없는 경우 폴백
    let candidateContents: typeof scoredContents
    if (scoredContents.length === 0) {
      const allContents = await prisma.content.findMany({
        take: 100,
        orderBy: [
          { developmentYear: 'desc' },
          { id: 'desc' }
        ]
      })
      candidateContents = allContents.map(c => ({
        content: c,
        similarity: 0.5,
        recencyScore: calculateRecencyScore(c.developmentYear),
        budgetScore: calculateBudgetScore(c.educationFee, collectedInfo.budget),
        totalScore: 0.5
      }))
    } else {
      candidateContents = scoredContents
    }

    // 5. AI에게 상세 정보와 함께 전달 (과정상세 포함!)
    const contentList = candidateContents.map((sc, i) => `
[${i + 1}] ${sc.content.courseName}
- ID: ${sc.content.id}
- 카테고리: ${sc.content.majorCategory} > ${sc.content.middleCategory} > ${sc.content.minorCategory}
- 차시: ${sc.content.sessions}
- 교육비: ${sc.content.educationFee}원
- 개발연도: ${sc.content.developmentYear || '미상'}
- 유사도점수: ${(sc.similarity * 100).toFixed(1)}%
- 최신성점수: ${(sc.recencyScore * 100).toFixed(1)}%
- 과정소개: ${sc.content.courseIntro || '없음'}
- 학습목표: ${sc.content.learningObjective || '없음'}
- 학습대상: ${sc.content.targetAudience || '없음'}
- 학습내용: ${formatCurriculum(sc.content.curriculum)}`).join('\n')

    // 6. 개선된 프롬프트로 추천 생성
    const prompt = `${IMPROVED_RECOMMENDATION_PROMPT}

<user_requirements>
${JSON.stringify(collectedInfo, null, 2)}
</user_requirements>

<candidate_contents>
${contentList}
</candidate_contents>

위 후보 콘텐츠 중에서 사용자 요구사항에 가장 적합한 **20-25개**를 선택하여 패키지를 구성하세요.

## 선정 원칙
1. **과정소개/학습목표 매칭**: 사용자의 학습목표와 콘텐츠의 학습목표가 일치하는지 최우선 고려
2. **학습대상 적합성**: 콘텐츠의 학습대상이 사용자의 직군/직급/레벨과 맞는지 확인
3. **최신성 우선**: 같은 조건이면 최신 강의(2024, 2023년)를 우선 선택
4. **예산 범위**: 총 교육비가 예산의 ±15% 이내
5. **학습 경로**: 입문 → 기초 → 심화 순서로 체계적 구성`

    const aiResponse = await generateChatCompletion([
      { role: 'system', content: '당신은 교육 콘텐츠 추천 전문가입니다. 반드시 20개 이상의 콘텐츠를 추천해야 합니다. JSON 형식으로만 응답하세요.' },
      { role: 'user', content: prompt }
    ], { maxTokens: 4000, temperature: 0.3 })

    let recommendation: ImprovedRecommendationResult
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        recommendation = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      console.error('Failed to parse recommendation:', aiResponse)
      // 폴백: 상위 20개 콘텐츠로 기본 추천 생성
      const selectedContents = candidateContents.slice(0, 20)
      recommendation = {
        packageName: `${collectedInfo.company} ${collectedInfo.targetGroup} 교육 패키지`,
        description: `${collectedInfo.learningGoal}을 위한 맞춤형 교육 패키지입니다. 최신 콘텐츠 위주로 구성되었습니다.`,
        selectedContents: selectedContents.map((sc, i) => ({
          contentId: sc.content.id,
          order: i + 1,
          reason: `${collectedInfo.skillLevel} 레벨에 적합한 교육 콘텐츠입니다. 유사도 ${(sc.similarity * 100).toFixed(0)}%, 최신성 ${(sc.recencyScore * 100).toFixed(0)}%`,
          score: Math.round(sc.totalScore * 100),
          matchingPoints: ['학습목표 매칭', '레벨 적합']
        })),
        summary: {
          totalFee: selectedContents.reduce((sum, sc) => sum + sc.content.educationFee, 0),
          totalSessions: selectedContents.reduce((sum, sc) => sum + sc.content.sessions, 0),
          estimatedDuration: collectedInfo.duration || '2개월',
          latestContentRatio: calculateLatestContentRatio(selectedContents.map(sc => sc.content))
        },
        learningPath: {
          foundation: selectedContents.slice(0, 7).map(sc => sc.content.id),
          intermediate: selectedContents.slice(7, 14).map(sc => sc.content.id),
          advanced: selectedContents.slice(14).map(sc => sc.content.id)
        },
        budgetNote: '예산 범위 내에서 구성되었습니다.'
      }
    }

    // 7. 패키지 DB 저장
    const pkg = await prisma.package.create({
      data: {
        name: recommendation.packageName,
        description: recommendation.description,
        targetCompany: collectedInfo.company || '',
        targetGroup: collectedInfo.targetGroup,
        requirements: collectedInfo as object,
        status: 'active',
        items: {
          create: recommendation.selectedContents.map(sc => ({
            contentId: sc.contentId,
            order: sc.order,
            reason: sc.reason,
            score: sc.score
          }))
        }
      }
    })

    return {
      recommendations: recommendation,
      packageId: pkg.id
    }
  } catch (error) {
    console.error('Generate recommendations error:', error)
    return null
  }
}

/**
 * 최신 콘텐츠 비율 계산
 */
function calculateLatestContentRatio(contents: Array<{ developmentYear?: string | null }>): string {
  const currentYear = new Date().getFullYear()
  const recentCount = contents.filter(c => {
    const year = parseInt(c.developmentYear || '0', 10)
    return year >= currentYear - 1
  }).length

  const ratio = contents.length > 0 ? Math.round((recentCount / contents.length) * 100) : 0
  return `${ratio}%가 ${currentYear - 1}-${currentYear}년 개발`
}

import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion } from '@/lib/openai'
import {
  SYSTEM_PROMPT,
  ChatResponse,
  CollectedInfo,
  isInfoComplete
} from '@/lib/prompts/system'
import { generateRecommendationsV2, V2RecommendationResult } from '@/lib/recommendation-v2'

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
      duration: collectedInfo.duration ?? null
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

    // If complete, generate recommendations using V2 pipeline
    let recommendations: V2RecommendationResult | null = null
    let packageId = null

    if (complete) {
      const result = await generateRecommendationsV2(parsedResponse.collectedInfo)

      // V2 pipeline returns either success result or error
      if ('recommendations' in result) {
        recommendations = result.recommendations
        packageId = result.packageId
      } else {
        // Error case - return error message
        console.error('V2 Recommendation Error:', result.message)
        return NextResponse.json({
          message: result.message,
          collectedInfo: parsedResponse.collectedInfo,
          isComplete: complete,
          recommendations: null,
          packageId: null,
          error: result
        })
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

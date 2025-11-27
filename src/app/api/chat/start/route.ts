import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { generateChatCompletion } from '@/lib/openai'
import { SYSTEM_PROMPT, ChatResponse, CollectedInfo } from '@/lib/prompts/system'

export async function POST() {
  try {
    const sessionId = uuidv4()

    const initialCollectedInfo: CollectedInfo = {
      company: null,
      industry: null,
      employeeCount: null,
      targetGroup: null,
      jobLevel: null,
      skillLevel: null,
      learningGoal: null,
      duration: null,
      budget: null
    }

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: '대화를 시작합니다. 첫 인사와 함께 첫 질문을 해주세요. JSON 형식으로 응답해주세요.'
      }
    ]

    const response = await generateChatCompletion(messages)

    let parsedResponse: ChatResponse
    try {
      parsedResponse = JSON.parse(response)
    } catch {
      parsedResponse = {
        message: '안녕하세요! Touch Contents AI 추천 시스템입니다. 😊\n\n귀사에 맞는 맞춤형 교육 콘텐츠 패키지를 추천해드리겠습니다.\n\n먼저, 회사명을 알려주시겠어요?',
        collectedInfo: initialCollectedInfo,
        isComplete: false
      }
    }

    return NextResponse.json({
      sessionId,
      message: parsedResponse.message,
      collectedInfo: parsedResponse.collectedInfo || initialCollectedInfo,
      isComplete: parsedResponse.isComplete || false
    })
  } catch (error) {
    console.error('Chat start error:', error)
    return NextResponse.json(
      { error: '대화를 시작하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

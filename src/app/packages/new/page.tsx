"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Circle,
  User,
  Bot
} from "lucide-react"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
}

// 백엔드와 일치하는 CollectedInfo 인터페이스
interface CollectedInfo {
  company: string | null
  industry: string | null
  employeeCount: number | null
  targetGroup: string | null
  jobLevel: string | null
  skillLevel: string | null
  learningGoal: string | null
  duration: string | null
}

const REQUIRED_FIELDS = [
  { key: "company", label: "기업명" },
  { key: "industry", label: "산업분야" },
  { key: "employeeCount", label: "교육인원" },
  { key: "targetGroup", label: "교육대상" },
  { key: "jobLevel", label: "직급/레벨" },
  { key: "skillLevel", label: "스킬레벨" },
  { key: "learningGoal", label: "학습목표" },
  { key: "duration", label: "교육기간" },
]

const INITIAL_COLLECTED_INFO: CollectedInfo = {
  company: null,
  industry: null,
  employeeCount: null,
  targetGroup: null,
  jobLevel: null,
  skillLevel: null,
  learningGoal: null,
  duration: null,
}

export default function NewPackagePage() {
  const router = useRouter()
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [collectedInfo, setCollectedInfo] = React.useState<CollectedInfo>(INITIAL_COLLECTED_INFO)
  const [isComplete, setIsComplete] = React.useState(false)
  const [packageId, setPackageId] = React.useState<number | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Start chat session on mount
  React.useEffect(() => {
    async function startSession() {
      try {
        const res = await fetch("/api/chat/start", { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          setSessionId(data.sessionId)
          setMessages([{
            role: "assistant",
            content: data.message
          }])
        }
      } catch (error) {
        console.error("Failed to start session:", error)
      }
    }
    startSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !sessionId || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          conversationHistory: messages,
          collectedInfo: collectedInfo
        })
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: "assistant", content: data.message }])

        // 백엔드에서 받은 collectedInfo 업데이트 (기존 값 유지하면서 새 값으로 덮어쓰기)
        if (data.collectedInfo) {
          setCollectedInfo(prev => ({
            ...prev,
            ...data.collectedInfo
          }))
        }

        if (data.isComplete && data.packageId) {
          setIsComplete(true)
          setPackageId(data.packageId)
        }
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요."
        }])
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "네트워크 오류가 발생했습니다. 다시 시도해 주세요."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldsCollected = () => {
    return REQUIRED_FIELDS.filter(field => {
      const value = collectedInfo[field.key as keyof CollectedInfo]
      return value !== null && value !== undefined && value !== ""
    }).length
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href="/packages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI 추천 대화
            </h1>
            <p className="text-sm text-slate-500">AI와 대화하여 맞춤 콘텐츠 패키지를 생성하세요</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {isComplete ? (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">패키지가 성공적으로 생성되었습니다!</span>
                </div>
                <Button onClick={() => router.push(`/packages/${packageId}`)}>
                  패키지 확인하기
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  disabled={isLoading || !sessionId}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !sessionId || !inputValue.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Progress Panel */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            정보 수집 현황
          </h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">진행률</span>
              <span className="font-medium">{getFieldsCollected()}/{REQUIRED_FIELDS.length}</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${(getFieldsCollected() / REQUIRED_FIELDS.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {REQUIRED_FIELDS.map((field) => {
              const value = collectedInfo[field.key as keyof CollectedInfo]
              const isCollected = value !== null && value !== undefined && value !== ""

              return (
                <div
                  key={field.key}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    isCollected
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "bg-slate-50 dark:bg-slate-700/50 text-slate-500"
                  }`}
                >
                  {isCollected ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1">{field.label}</span>
                  {isCollected && (
                    <span className="text-xs truncate max-w-24" title={String(value)}>
                      {String(value)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {isComplete && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
                모든 정보가 수집되어<br />패키지가 생성되었습니다!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

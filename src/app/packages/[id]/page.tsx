"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Package,
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Clock,
  Target,
  Briefcase,
  Calendar,
  MessageSquare,
  Archive,
  Trash2,
  Edit,
  Download,
  Star,
  ExternalLink
} from "lucide-react"

interface ContentItem {
  order: number
  reason: string
  score: number
  content: {
    id: number
    courseName: string
    majorCategory: string
    middleCategory: string | null
    minorCategory: string | null
    courseIntro: string | null
    educationFee: number
    sessions: number
  }
}

interface PackageDetail {
  id: number
  name: string
  description: string | null
  targetCompany: string
  targetGroup: string | null
  requirements: {
    // 백엔드 CollectedInfo와 일치
    company?: string | null
    industry?: string | null
    employeeCount?: number | null
    targetGroup?: string | null
    jobLevel?: string | null
    skillLevel?: string | null
    learningGoal?: string | null
    duration?: string | null
  }
  status: string
  createdAt: string
  updatedAt: string
  items: ContentItem[]
}

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pkg, setPkg] = React.useState<PackageDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchPackage() {
      if (!params.id) return

      setIsLoading(true)
      try {
        const res = await fetch(`/api/packages/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          // API 응답 형식에 맞게 변환
          setPkg({
            ...data.package,
            items: data.items || []
          })
        } else if (res.status === 404) {
          setError("패키지를 찾을 수 없습니다")
        } else {
          setError("패키지를 불러오는 중 오류가 발생했습니다")
        }
      } catch (err) {
        console.error("Failed to fetch package:", err)
        setError("네트워크 오류가 발생했습니다")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPackage()
  }, [params.id])

  const handleStatusChange = async () => {
    if (!pkg) return

    try {
      const newStatus = pkg.status === 'active' ? 'archived' : 'active'
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setPkg(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  const handleDelete = async () => {
    if (!pkg) return
    if (!confirm("정말로 이 패키지를 삭제하시겠습니까?")) return

    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        router.push("/packages/list")
      }
    } catch (error) {
      console.error("Failed to delete package:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return "-"
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW"
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">{error || "패키지를 찾을 수 없습니다"}</h3>
          <Link href="/packages/list">
            <Button>목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/packages/list">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleStatusChange}>
            <Archive className="h-4 w-4 mr-2" />
            {pkg.status === 'active' ? '보관하기' : '활성화'}
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* Package Info Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{pkg.name}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                pkg.status === 'active'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/20 text-slate-200'
              }`}>
                {pkg.status === 'active' ? '활성' : '보관'}
              </span>
            </div>
            {pkg.description && (
              <p className="text-indigo-100 mb-4">{pkg.description}</p>
            )}
            <div className="flex items-center gap-6 text-sm text-indigo-100">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {pkg.targetCompany}
              </span>
              {pkg.targetGroup && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {pkg.targetGroup}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {pkg.items.length}개 콘텐츠
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDate(pkg.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requirements Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              수집된 요구사항
            </h3>
            <div className="space-y-4">
              {pkg.requirements?.company && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> 기업명
                  </div>
                  <div className="text-sm">{pkg.requirements.company}</div>
                </div>
              )}
              {pkg.requirements?.industry && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> 산업분야
                  </div>
                  <div className="text-sm">{pkg.requirements.industry}</div>
                </div>
              )}
              {pkg.requirements?.employeeCount && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Users className="h-3 w-3" /> 교육인원
                  </div>
                  <div className="text-sm">{pkg.requirements.employeeCount}명</div>
                </div>
              )}
              {pkg.requirements?.targetGroup && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Users className="h-3 w-3" /> 교육대상
                  </div>
                  <div className="text-sm">{pkg.requirements.targetGroup}</div>
                </div>
              )}
              {pkg.requirements?.jobLevel && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> 직급/레벨
                  </div>
                  <div className="text-sm">{pkg.requirements.jobLevel}</div>
                </div>
              )}
              {pkg.requirements?.skillLevel && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Star className="h-3 w-3" /> 스킬레벨
                  </div>
                  <div className="text-sm">{pkg.requirements.skillLevel}</div>
                </div>
              )}
              {pkg.requirements?.learningGoal && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> 학습목표
                  </div>
                  <div className="text-sm">{pkg.requirements.learningGoal}</div>
                </div>
              )}
              {pkg.requirements?.duration && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> 교육기간
                  </div>
                  <div className="text-sm">{pkg.requirements.duration}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              추천 콘텐츠 ({pkg.items.length}개)
            </h3>

            {pkg.items.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>추천된 콘텐츠가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pkg.items
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <div
                      key={item.content.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h4 className="font-medium truncate">{item.content.courseName}</h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                                <Star className="h-4 w-4 text-amber-500 fill-current" />
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.score}</span>
                                <span className="text-xs text-amber-500 dark:text-amber-500">/100</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-2">
                            <span>{item.content.majorCategory}</span>
                            {item.content.middleCategory && <span>{item.content.middleCategory}</span>}
                            {item.content.minorCategory && <span>{item.content.minorCategory}</span>}
                          </div>
                          {item.content.courseIntro && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                              {item.content.courseIntro}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500">
                              <Clock className="h-3.5 w-3.5 inline mr-1" />
                              {item.content.sessions}차시
                            </span>
                            <span className="text-slate-500">
                              {formatPrice(item.content.educationFee)}
                            </span>
                          </div>
                          <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-sm">
                            <span className="text-xs font-medium text-slate-500">추천 이유:</span>
                            <p className="text-slate-600 dark:text-slate-300">{item.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AI 콘텐츠 추천 시스템 V2 타입 정의
 * VMSRP (Validation-based Multi-Stage Recommendation Pipeline)
 */

import { Content } from '@prisma/client'
import { CollectedInfo } from '@/lib/prompts/system'

// Stage 1: Intent Extraction
export interface SearchIntent {
  primaryKeywords: string[]      // 핵심 키워드: ["AI", "머신러닝", "딥러닝"]
  secondaryKeywords: string[]    // 보조 키워드: ["Python", "TensorFlow", "데이터"]
  domain: string                 // 도메인: "IT/개발"
  targetLevel: string            // 대상 레벨: "중급"
  exclusionKeywords: string[]    // 제외 키워드: ["물류", "마케팅", "음성"]
  technicalStack: string[]       // 기술 스택: ["Python", "PyTorch"]
}

// Stage 3: Hybrid Scoring
export interface ScoredContent {
  content: Content
  scores: {
    keywordMatch: number      // 0-1: 키워드 매칭 점수
    vectorSimilarity: number  // 0-1: 벡터 유사도
    categoryRelevance: number // 0-1: 카테고리 관련성
    recencyScore: number      // 0-1: 최신성
    totalScore: number        // 가중 합계
  }
  matchedKeywords: string[]   // 매칭된 키워드 목록
}

// Stage 4: LLM Relevance Validation
export interface RelevanceResult {
  contentId: number
  relevanceScore: number  // 1-10
  isRelevant: boolean     // score >= 6
  reason: string          // 관련성 판단 이유
}

// Stage 5: Grounded Reason Generation
export interface GroundedRecommendation {
  contentId: number
  reason: string
  citations: string[]  // 인용된 원본 텍스트
}

// Stage 6: Fact Verification
export interface VerificationResult {
  contentId: number
  reason: string
  isVerified: boolean
  failedCitations: string[]  // 검증 실패한 인용
}

// Final Package Assembly
export interface V2RecommendationResult {
  packageName: string
  description: string
  selectedContents: Array<{
    contentId: number
    order: number
    reason: string
    score: number
    relevanceScore: number
    matchedKeywords: string[]
    citations: string[]
  }>
  summary: {
    totalFee: number
    totalSessions: number
    estimatedDuration: string
    latestContentRatio: string
    totalRecommended: number
  }
  learningPath: {
    foundation: number[]
    intermediate: number[]
    advanced: number[]
  }
  pipelineMetrics: {
    stage1_intentExtraction: number  // 추출된 키워드 수
    stage2_hardFilter: number        // 필터링 후 남은 콘텐츠 수
    stage3_hybridScoring: number     // 점수 임계값 통과 수
    stage4_relevanceValidation: number // 관련성 검증 통과 수
    stage5_reasonGeneration: number  // 이유 생성 완료 수
    stage6_factVerification: number  // 사실 검증 통과 수
    stage7_finalPackage: number      // 최종 패키지 콘텐츠 수
  }
}

// Pipeline Stage Results for Monitoring
export interface PipelineStageResult<T> {
  stage: string
  success: boolean
  inputCount: number
  outputCount: number
  data: T
  error?: string
  timestamp: Date
}

// Error Response
export interface RecommendationError {
  success: false
  requiresManualReview?: boolean
  message: string
  suggestion?: string
  alternatives?: string[]
  candidates?: Content[]
}

// Configuration
export interface V2Config {
  // Stage 3 Hybrid Scoring Weights
  weights: {
    keywordMatch: number      // 40%
    vectorSimilarity: number  // 25%
    categoryRelevance: number // 20%
    recencyScore: number      // 15%
  }
  // Thresholds
  thresholds: {
    hybridScoreMin: number    // 0.5
    relevanceScoreMin: number // 6
    textSimilarityMin: number // 0.8
  }
  // Batch Processing
  batch: {
    relevanceValidation: number // 10
    reasonGeneration: number    // 5
  }
  // Model Configuration
  models: {
    intentExtraction: string    // gpt-4o
    relevanceValidation: string // gpt-4o
    reasonGeneration: string    // gpt-4o
  }
}

export const DEFAULT_V2_CONFIG: V2Config = {
  weights: {
    keywordMatch: 0.40,
    vectorSimilarity: 0.25,
    categoryRelevance: 0.20,
    recencyScore: 0.15
  },
  thresholds: {
    hybridScoreMin: 0.5,
    relevanceScoreMin: 6,
    textSimilarityMin: 0.8
  },
  batch: {
    relevanceValidation: 10,
    reasonGeneration: 5
  },
  models: {
    intentExtraction: 'gpt-4o',
    relevanceValidation: 'gpt-4o',
    reasonGeneration: 'gpt-4o'
  }
}

// Domain Mappings
export const DOMAIN_CATEGORIES: Record<string, string[]> = {
  'IT/개발': ['개발', 'IT', '프로그래밍', '소프트웨어', '데이터', '인공지능', 'AI', '클라우드'],
  '경영/관리': ['경영', '관리', '리더십', 'MBA', '전략', '조직'],
  '마케팅': ['마케팅', '광고', '브랜딩', '디지털마케팅', 'SNS'],
  '디자인': ['디자인', 'UI', 'UX', '그래픽', '편집'],
  '금융/회계': ['금융', '회계', '재무', '투자', '보험'],
  '인사/조직': ['인사', 'HR', '채용', '평가', '조직문화'],
  '영업/고객': ['영업', '세일즈', '고객', 'CS', '서비스']
}

// Tech Keywords for Hallucination Detection
export const TECH_KEYWORDS = [
  'Flutter', 'React', 'Vue', 'Angular', 'Python', 'Java', 'JavaScript', 'TypeScript',
  'Node.js', 'TensorFlow', 'PyTorch', 'AWS', 'Docker', 'Kubernetes', 'Spring',
  'Django', 'FastAPI', 'Next.js', 'GraphQL', 'REST', 'SQL', 'NoSQL', 'MongoDB',
  'PostgreSQL', 'Redis', 'Kafka', 'RabbitMQ', 'Git', 'CI/CD', 'DevOps',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'LLM', 'GPT',
  'Transformer', 'CNN', 'RNN', 'LSTM', 'GAN', 'Reinforcement Learning'
]

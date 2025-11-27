# VMSRP 코드 매핑 문서

## 개요

이 문서는 VMSRP (Validation-based Multi-Stage Recommendation Pipeline)의 각 단계가 실제 코드에서 어떻게 구현되어 있는지를 상세히 설명합니다.

---

## 파일 구조

```
src/lib/recommendation-v2/
├── index.ts          # 모듈 진입점 (export)
├── pipeline.ts       # 7단계 파이프라인 핵심 로직
├── types.ts          # 타입 정의 및 설정값
└── prompts.ts        # 각 단계별 LLM 프롬프트
```

---

## Stage 1: Intent Extraction (의도 추출)

### 목적
사용자의 학습 요청에서 핵심 키워드, 도메인, 제외 키워드 등을 추출

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `extractSearchIntent()` | 149-176 |
| `pipeline.ts` | `extractIntentFallback()` | 181-195 |
| `pipeline.ts` | `detectDomain()` | 200-209 |
| `prompts.ts` | `INTENT_EXTRACTION_PROMPT` | 7-50 |
| `prompts.ts` | `buildIntentExtractionPrompt()` | 181-196 |
| `types.ts` | `SearchIntent` interface | 10-17 |

### 핵심 로직

```typescript
// pipeline.ts:149-176
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

  const response = await generateChatCompletion([
    { role: 'system', content: '당신은 교육 콘텐츠 검색 전문가입니다. JSON 형식으로만 응답하세요.' },
    { role: 'user', content: prompt }
  ], { model: 'gpt-4o', temperature: 0.1 })  // GPT-4o 사용

  // JSON 파싱 및 반환
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }

  // Fallback: 단순 키워드 추출
  return extractIntentFallback(collectedInfo)
}
```

### 출력 데이터 구조

```typescript
// types.ts:10-17
interface SearchIntent {
  primaryKeywords: string[]      // 핵심 키워드: ["AI", "머신러닝", "딥러닝"]
  secondaryKeywords: string[]    // 보조 키워드: ["Python", "TensorFlow"]
  domain: string                 // 도메인: "IT/개발"
  targetLevel: string            // 대상 레벨: "중급"
  exclusionKeywords: string[]    // 제외 키워드: ["물류", "마케팅"]
  technicalStack: string[]       // 기술 스택: ["Python", "PyTorch"]
}
```

---

## Stage 2: Hard Filter (SQL 규칙 기반 필터링)

### 목적
SQL WHERE 조건으로 키워드가 포함되지 않은 콘텐츠를 완전 제거

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `hardFilter()` | 215-251 |

### 핵심 로직

```typescript
// pipeline.ts:215-251
async function hardFilter(intent: SearchIntent): Promise<Content[]> {
  const allKeywords = [...intent.primaryKeywords, ...intent.secondaryKeywords]

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
```

### 검색 대상 필드
- `courseName` (과정명)
- `courseIntro` (과정소개)
- `learningObjective` (학습목표)
- `majorCategory` (대분류)
- `middleCategory` (중분류)
- `minorCategory` (소분류)

---

## Stage 3: Hybrid Scoring (복합 점수 계산)

### 목적
키워드 매칭, 벡터 유사도, 카테고리 관련성, 최신성을 복합 계산

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `hybridScoring()` | 257-323 |
| `pipeline.ts` | `calculateCategoryRelevance()` | 328-334 |
| `embedding-utils.ts` | `calculateRecencyScore()` | 130-141 |
| `openai.ts` | `generateEmbedding()` | 7-13 |
| `openai.ts` | `cosineSimilarity()` | 23-34 |
| `types.ts` | `ScoredContent` interface | 20-30 |
| `types.ts` | `DEFAULT_V2_CONFIG.weights` | 141-146 |

### 핵심 로직

```typescript
// pipeline.ts:257-323
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
  const embeddings = await prisma.contentEmbedding.findMany({
    where: { contentId: { in: contentIds } }
  })

  // 점수 계산
  const scoredContents = contents.map(content => {
    // 1. Keyword Match Score (40%)
    const matchedKeywords = allKeywords.filter(kw => contentText.includes(kw.toLowerCase()))
    const keywordMatch = matchedKeywords.length / allKeywords.length

    // 2. Vector Similarity (25%)
    const vectorSimilarity = cosineSimilarity(queryEmbedding, contentEmbedding)

    // 3. Category Relevance (20%)
    const categoryRelevance = calculateCategoryRelevance(content, intent.domain)

    // 4. Recency Score (15%)
    const recencyScore = calculateRecencyScore(content.developmentYear)

    // 가중 합계
    const totalScore =
      (keywordMatch * 0.40) +
      (vectorSimilarity * 0.25) +
      (categoryRelevance * 0.20) +
      (recencyScore * 0.15)

    return { content, scores, matchedKeywords }
  })

  // 임계값 필터링 (threshold >= 0.5)
  return scoredContents
    .filter(sc => sc.scores.totalScore >= config.thresholds.hybridScoreMin)
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore)
}
```

### 가중치 배분 (types.ts:141-146)

| 요소 | 가중치 | 설명 |
|-----|-------|-----|
| Keyword Match | 40% | 핵심 키워드 포함 여부 |
| Vector Similarity | 25% | OpenAI 임베딩 코사인 유사도 |
| Category Relevance | 20% | 도메인-카테고리 일치도 |
| Recency Score | 15% | 개발연도 기반 최신성 |

### 임계값 설정 (types.ts:148)

```typescript
thresholds: {
  hybridScoreMin: 0.5,  // Stage 3 통과 임계값
  // ...
}
```

---

## Stage 4: LLM Relevance Validation (관련성 검증)

### 목적
GPT-4o가 각 콘텐츠의 관련성을 1-10점으로 평가

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `validateRelevance()` | 340-409 |
| `prompts.ts` | `RELEVANCE_VALIDATION_PROMPT` | 53-103 |
| `prompts.ts` | `buildRelevanceValidationPrompt()` | 199-216 |
| `prompts.ts` | `formatContentForValidation()` | 162-178 |
| `types.ts` | `RelevanceResult` interface | 33-38 |
| `types.ts` | `DEFAULT_V2_CONFIG.batch.relevanceValidation` | 129 |

### 핵심 로직

```typescript
// pipeline.ts:340-409
async function validateRelevance(
  scoredContents: ScoredContent[],
  collectedInfo: CollectedInfo,
  config: typeof DEFAULT_V2_CONFIG
): Promise<Array<{ scored: ScoredContent; relevance: RelevanceResult }>> {
  const results = []
  const BATCH_SIZE = config.batch.relevanceValidation  // 10개씩 배치

  for (let i = 0; i < scoredContents.length; i += BATCH_SIZE) {
    const batch = scoredContents.slice(i, i + BATCH_SIZE)

    const contentList = batch.map((sc, idx) =>
      formatContentForValidation(sc.content, idx)
    ).join('\n')

    const prompt = buildRelevanceValidationPrompt(
      collectedInfo.learningGoal || '',
      { targetGroup, jobLevel, skillLevel, industry },
      contentList
    )

    const response = await generateChatCompletion([
      { role: 'system', content: '교육 콘텐츠 관련성을 평가합니다. JSON 배열 형식으로만 응답하세요.' },
      { role: 'user', content: prompt }
    ], { model: 'gpt-4o', temperature: 0.1 })

    // 관련성 점수 6점 이상만 통과
    for (const result of batchResults) {
      if (result.relevanceScore >= config.thresholds.relevanceScoreMin) {
        results.push({ scored, relevance: { ...result, isRelevant: true } })
      }
    }
  }

  return results
}
```

### 평가 기준 (prompts.ts:68-95)

| 점수 | 의미 | 설명 |
|-----|-----|-----|
| 1-3점 | 전혀 관련 없음 | 학습 목표와 완전히 다른 분야 |
| 4-5점 | 간접적 관련 | 일부 개념이 겹치지만 직접적이지 않음 |
| 6-7점 | 관련 있음 | 학습 목표와 직접 연결, 핵심 키워드 일치 |
| 8-10점 | 매우 관련 있음 | 학습 목표 직접 달성에 도움 |

### 임계값 (types.ts:149)

```typescript
thresholds: {
  relevanceScoreMin: 6,  // Stage 4 통과 임계값
  // ...
}
```

---

## Stage 5: Grounded Reason Generation (근거 기반 추천 이유 생성)

### 목적
실제 콘텐츠 정보를 인용하여 추천 이유 작성 (Hallucination 방지)

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `generateGroundedReasons()` | 415-462 |
| `prompts.ts` | `GROUNDED_REASON_PROMPT` | 106-129 |
| `prompts.ts` | `buildGroundedReasonPrompt()` | 219-246 |
| `types.ts` | `GroundedRecommendation` interface | 41-45 |
| `types.ts` | `DEFAULT_V2_CONFIG.batch.reasonGeneration` | 130 |

### 핵심 로직

```typescript
// pipeline.ts:415-462
async function generateGroundedReasons(
  relevantContents: Array<{ scored: ScoredContent; relevance: RelevanceResult }>,
  collectedInfo: CollectedInfo,
  config: typeof DEFAULT_V2_CONFIG
): Promise<GroundedRecommendation[]> {
  const BATCH_SIZE = config.batch.reasonGeneration  // 5개씩 배치

  for (let i = 0; i < relevantContents.length; i += BATCH_SIZE) {
    const batch = relevantContents.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async ({ scored }) => {
      const prompt = buildGroundedReasonPrompt(
        collectedInfo.learningGoal || '',
        scored.content
      )

      const response = await generateChatCompletion([
        { role: 'system', content: '콘텐츠 정보를 정확히 인용하여 추천 이유를 작성합니다.' },
        { role: 'user', content: prompt }
      ], { model: 'gpt-4o', temperature: 0.3 })

      // 인용문 추출
      const citations = response.match(/['"]([^'"]+)['"]/g)?.map(c => c.replace(/['"]/g, '')) || []

      return { contentId, reason: response.trim(), citations }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}
```

### 프롬프트 규칙 (prompts.ts:106-129)

```
## 중요 규칙
1. 추천 이유는 반드시 콘텐츠의 실제 정보를 인용해야 합니다
2. 콘텐츠에 없는 내용을 상상하여 작성하지 마세요
3. 인용 형식: "이 과정은 '[실제 과정소개 인용]'으로..."
4. 반드시 아래 제공된 콘텐츠 정보 내에서만 인용하세요
```

---

## Stage 6: Fact Verification (사실 검증)

### 목적
추천 이유에서 인용된 내용이 실제 콘텐츠에 존재하는지 검증, Hallucination 탐지

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `verifyFacts()` | 468-522 |
| `pipeline.ts` | `calculateTextSimilarity()` | 527-535 |
| `types.ts` | `VerificationResult` interface | 48-53 |
| `types.ts` | `TECH_KEYWORDS` | 175-182 |

### 핵심 로직

```typescript
// pipeline.ts:468-522
function verifyFacts(
  recommendations: GroundedRecommendation[],
  scoredContents: ScoredContent[]
): VerificationResult[] {
  return recommendations.map(rec => {
    const content = contentMap.get(rec.contentId)
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
```

### Hallucination 탐지 대상 기술 키워드 (types.ts:175-182)

```typescript
export const TECH_KEYWORDS = [
  'Flutter', 'React', 'Vue', 'Angular', 'Python', 'Java', 'JavaScript', 'TypeScript',
  'Node.js', 'TensorFlow', 'PyTorch', 'AWS', 'Docker', 'Kubernetes', 'Spring',
  'Django', 'FastAPI', 'Next.js', 'GraphQL', 'REST', 'SQL', 'NoSQL', 'MongoDB',
  'PostgreSQL', 'Redis', 'Kafka', 'RabbitMQ', 'Git', 'CI/CD', 'DevOps',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'LLM', 'GPT',
  'Transformer', 'CNN', 'RNN', 'LSTM', 'GAN', 'Reinforcement Learning'
]
```

---

## Stage 7: Package Assembly (패키지 조립)

### 목적
검증된 콘텐츠로 최종 패키지 구성, 학습 경로 설계, DB 저장

### 코드 위치
| 파일 | 함수/위치 | 라인 |
|-----|---------|-----|
| `pipeline.ts` | `assemblePackage()` | 541-651 |
| `types.ts` | `V2RecommendationResult` interface | 56-89 |

### 핵심 로직

```typescript
// pipeline.ts:541-651
async function assemblePackage(
  verifiedRecommendations: VerificationResult[],
  relevantContents: Array<{ scored: ScoredContent; relevance: RelevanceResult }>,
  collectedInfo: CollectedInfo,
  metrics: V2RecommendationResult['pipelineMetrics']
): Promise<{ recommendations: V2RecommendationResult; packageId: number }> {

  // 학습 경로 구성
  const foundation: number[] = []   // 기초
  const intermediate: number[] = [] // 중급
  const advanced: number[] = []     // 심화

  for (const verified of verifiedRecommendations) {
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
  const totalFee = selectedContents.reduce((sum, sc) => sum + (content?.educationFee || 0), 0)
  const totalSessions = selectedContents.reduce((sum, sc) => sum + (content?.sessions || 0), 0)

  // 최신 콘텐츠 비율 계산
  const recentCount = selectedContents.filter(sc => year >= currentYear - 1).length
  const latestRatio = Math.round((recentCount / selectedContents.length) * 100)

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

  return { recommendations: recommendation, packageId: pkg.id }
}
```

### 출력 데이터 구조 (types.ts:56-89)

```typescript
interface V2RecommendationResult {
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
    foundation: number[]    // 기초 과정 ID
    intermediate: number[]  // 중급 과정 ID
    advanced: number[]      // 심화 과정 ID
  }
  pipelineMetrics: {
    stage1_intentExtraction: number
    stage2_hardFilter: number
    stage3_hybridScoring: number
    stage4_relevanceValidation: number
    stage5_reasonGeneration: number
    stage6_factVerification: number
    stage7_finalPackage: number
  }
}
```

---

## 파이프라인 호출 흐름

### 진입점: API Route

```
src/app/api/chat/message/route.ts
```

```typescript
// route.ts:9
import { generateRecommendationsV2, V2RecommendationResult } from '@/lib/recommendation-v2'

// route.ts:92-99
if (complete) {
  const result = await generateRecommendationsV2(parsedResponse.collectedInfo)

  if ('recommendations' in result) {
    recommendations = result.recommendations
    packageId = result.packageId
  }
}
```

### 파이프라인 메인 함수

```
src/lib/recommendation-v2/pipeline.ts:33-143
```

```typescript
export async function generateRecommendationsV2(
  collectedInfo: CollectedInfo
): Promise<{ recommendations: V2RecommendationResult; packageId: number } | RecommendationError> {

  // Stage 1: Intent Extraction (line 50-55)
  const intent = await extractSearchIntent(collectedInfo)

  // Stage 2: Hard Filter (line 57-65)
  const hardFilteredContents = await hardFilter(intent)

  // Stage 3: Hybrid Scoring (line 67-75)
  const scoredContents = await hybridScoring(hardFilteredContents, intent, collectedInfo, config)

  // Stage 4: LLM Relevance Validation (line 77-85)
  const relevantContents = await validateRelevance(scoredContents, collectedInfo, config)

  // Stage 5: Grounded Reason Generation (line 87-95)
  const groundedRecommendations = await generateGroundedReasons(relevantContents, collectedInfo, config)

  // Stage 6: Fact Verification (line 97-104)
  const verifiedRecommendations = verifyFacts(groundedRecommendations, relevantContents.map(r => r.scored))

  // Stage 7: Package Assembly (line 106-132)
  return await assemblePackage(finalContents, relevantContents, collectedInfo, metrics)
}
```

---

## 설정값 참조

### 전체 설정 (types.ts:140-160)

```typescript
export const DEFAULT_V2_CONFIG: V2Config = {
  weights: {
    keywordMatch: 0.40,      // Stage 3: 키워드 매칭 가중치
    vectorSimilarity: 0.25,  // Stage 3: 벡터 유사도 가중치
    categoryRelevance: 0.20, // Stage 3: 카테고리 관련성 가중치
    recencyScore: 0.15       // Stage 3: 최신성 가중치
  },
  thresholds: {
    hybridScoreMin: 0.5,     // Stage 3: 복합 점수 임계값
    relevanceScoreMin: 6,    // Stage 4: 관련성 점수 임계값 (1-10)
    textSimilarityMin: 0.8   // Stage 6: 텍스트 유사도 임계값
  },
  batch: {
    relevanceValidation: 10, // Stage 4: 배치 크기
    reasonGeneration: 5      // Stage 5: 배치 크기
  },
  models: {
    intentExtraction: 'gpt-4o',     // Stage 1: 모델
    relevanceValidation: 'gpt-4o',  // Stage 4: 모델
    reasonGeneration: 'gpt-4o'      // Stage 5: 모델
  }
}
```

---

## 의존성 관계도

```
pipeline.ts
├── types.ts (타입, 설정, 상수)
├── prompts.ts (LLM 프롬프트)
├── @/lib/prisma.ts (DB 접근)
├── @/lib/openai.ts (임베딩, 채팅)
├── @/lib/embedding-utils.ts (최신성 점수)
└── @/lib/prompts/system.ts (CollectedInfo 타입)
```

# AI 콘텐츠 추천 시스템 V2: 검증 기반 다단계 파이프라인

## 문서 정보
- **버전**: 2.0
- **작성일**: 2024-11-27
- **목적**: 기존 추천 시스템의 근본적 문제 해결을 위한 새로운 아키텍처 설계

---

## 1. 현재 시스템의 근본적 문제점 분석

### 1.1 발생한 문제 현상
```
요청: "AI 및 머신러닝 개발 역량 강화 패키지"

잘못된 추천 결과:
1. "실전 구글 활용법, 구글 워크스페이스" → 완전히 무관
2. "2022 물류업 DT 트렌드" → 무관
3. "첫인상 호감으로 만드는 목소리 훈련법" → 완전히 무관

더 심각한 문제 - Hallucination:
- "목소리 훈련법"의 추천 이유: "Flutter 중급 과정으로, AI와 머신러닝을 활용한 앱 개발..."
- 콘텐츠 내용과 추천 이유가 완전히 불일치
```

### 1.2 근본 원인 분석

#### 원인 1: Vector-Only 검색의 한계
```typescript
// 현재 구현: message/route.ts line 132-168
const searchQuery = buildSmartSearchQuery(collectedInfo)
// 생성되는 쿼리: "학습목표: AI 및 머신러닝 개발 역량 강화\n학습대상: 개발자..."

const queryEmbedding = await generateEmbedding(searchQuery)
// 이 쿼리의 embedding이 "목소리 훈련법"과 높은 유사도를 가질 수 있음!
// 왜? "역량 강화"라는 일반적 단어가 대부분의 교육 콘텐츠와 매칭됨
```

**문제점:**
- `text-embedding-3-small`은 일반적인 의미 유사성을 측정
- "AI", "머신러닝" 같은 **특정 기술 키워드**를 명확히 구분하지 못함
- 모든 교육 콘텐츠가 "역량", "개발", "학습" 같은 단어를 포함

#### 원인 2: 유사도 임계값 부재
```typescript
// 현재 구현: 유사도 점수와 무관하게 상위 60개 반환
.sort((a, b) => b.totalScore - a.totalScore)
.slice(0, 60) // 상위 60개 후보 추출
```

**문제점:**
- 유사도 0.1이어도 상위 60개에 포함되면 후보가 됨
- **관련성 검증 없이** AI에게 전달
- "관련 없음"을 인정하지 않는 시스템

#### 원인 3: LLM의 Hallucination
```typescript
// 현재 구현: gpt-4o-mini로 60개 콘텐츠 처리
const aiResponse = await generateChatCompletion([
  { role: 'system', content: '...' },
  { role: 'user', content: prompt } // 60개 콘텐츠 정보가 포함된 긴 프롬프트
], { maxTokens: 4000, temperature: 0.3 })
```

**문제점:**
- `gpt-4o-mini`가 60개 콘텐츠 정보를 제대로 처리하지 못함
- 콘텐츠 정보를 무시하고 **상상으로 추천 이유 생성**
- "목소리 훈련법"에 "Flutter 중급 과정" 설명 = 콘텐츠 정보를 읽지 않음

#### 원인 4: 폴백 로직의 위험성
```typescript
// 현재 구현: JSON 파싱 실패 시
catch {
  const selectedContents = candidateContents.slice(0, 20) // 무조건 상위 20개 선택
  recommendation = {
    selectedContents: selectedContents.map((sc, i) => ({
      reason: `${collectedInfo.skillLevel} 레벨에 적합한 교육 콘텐츠입니다.`
      // 실제 콘텐츠 내용과 무관한 일반적인 이유
    }))
  }
}
```

**문제점:**
- AI 응답 파싱 실패 시 **관련성 무관하게** 상위 20개 자동 선택
- 이것이 잘못된 추천의 주요 원인일 가능성 높음

---

## 2. 새로운 아키텍처: 검증 기반 다단계 파이프라인 (VMSRP)

### 2.1 핵심 설계 원칙

| 원칙 | 기존 시스템 | 새로운 시스템 |
|------|------------|--------------|
| 검색 전략 | Vector-only | Hybrid (Keyword + Category + Vector) |
| 품질 관리 | 없음 | 각 단계별 임계값과 검증 |
| LLM 역할 | 선택 + 이유 생성 | 검증자(Judge) + 근거 기반 생성 |
| Hallucination | 방치 | 자동 탐지 및 제거 |
| 폴백 전략 | 무작위 상위 N개 | "관련 콘텐츠 없음" 정직하게 반환 |
| **추천 개수** | **20-25개 고정** | **개수 제한 없음 (관련 있는 모든 콘텐츠)** |

### 2.1.1 추천 개수 정책: 무제한 (No Limit)

**기존 시스템의 문제:**
- 고정된 20-25개 추천으로 인해 관련 콘텐츠가 누락될 수 있음
- 예: AI/머신러닝 관련 콘텐츠가 50개 있어도 25개만 추천

**새로운 정책:**
- **관련성 점수 6점 이상인 모든 콘텐츠를 추천**
- DB에 저장된 3,317개 콘텐츠 중 관련 있는 모든 것을 반환
- 개수가 아닌 **품질(관련성 점수)**로 필터링

```typescript
// ❌ 기존: 개수 제한
const recommendations = validatedContents.slice(0, 25)

// ✅ 새로운 방식: 관련성 기준으로만 필터링
const recommendations = validatedContents.filter(c => c.relevanceScore >= 6)
// 결과: 10개일 수도, 50개일 수도, 100개일 수도 있음
```

**예상 결과:**
| 요청 | 관련 콘텐츠 수 | 추천 결과 |
|------|--------------|----------|
| "AI 머신러닝 개발" | ~80개 | 80개 모두 추천 |
| "React 프론트엔드" | ~45개 | 45개 모두 추천 |
| "신입사원 기초교육" | ~120개 | 120개 모두 추천 |
| "양자컴퓨팅 고급" | ~5개 | 5개만 추천 (적어도 정직하게) |

### 2.2 전체 파이프라인 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                      사용자 요청                                 │
│              "AI 및 머신러닝 개발 역량 강화"                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Intent Extraction (의도 추출)                          │
│  ─────────────────────────────────────────────────────────────  │
│  • LLM으로 사용자 요청에서 핵심 정보 추출                         │
│  • Output:                                                       │
│    - primary_keywords: ["AI", "머신러닝", "딥러닝", "인공지능"]   │
│    - domain: "IT/개발"                                           │
│    - skill_level: "중급"                                         │
│    - exclusion_keywords: ["물류", "마케팅", "영업"]               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Hard Filter (규칙 기반 필터링)                         │
│  ─────────────────────────────────────────────────────────────  │
│  • SQL WHERE 조건으로 명확히 무관한 콘텐츠 제거                   │
│  • 조건:                                                         │
│    - majorCategory ILIKE ANY(keywords) OR                        │
│    - middleCategory ILIKE ANY(keywords) OR                       │
│    - courseName ILIKE ANY(keywords) OR                           │
│    - courseIntro ILIKE ANY(keywords)                             │
│  • 이 단계에서 "목소리 훈련", "물류 트렌드" 완전 제거             │
│  • Output: ~100-300개 후보                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Hybrid Scoring (복합 점수 계산)                        │
│  ─────────────────────────────────────────────────────────────  │
│  • 다중 요소 점수 계산:                                          │
│    - Keyword Match Score (35%): 핵심 키워드 포함 개수            │
│    - Vector Similarity (25%): 의미적 유사도                      │
│    - Category Relevance (20%): 카테고리 일치도                   │
│    - Recency Score (15%): 최신성                                 │
│    - Budget Fit (5%): 예산 적합성                                │
│  • Threshold: totalScore >= 0.5                                  │
│  • Output: ~30-50개 후보                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: LLM Relevance Validation (LLM 관련성 검증)             │
│  ─────────────────────────────────────────────────────────────  │
│  • 모델: gpt-4o 또는 claude-3.5-sonnet (품질 우선)               │
│  • 처리 방식: 10개씩 배치                                        │
│  • 각 콘텐츠에 대해 질문:                                        │
│    "이 콘텐츠가 'AI 및 머신러닝 개발 역량 강화'와                │
│     관련이 있습니까? 1-10점으로 평가하세요."                     │
│  • Threshold: score >= 6                                         │
│  • ⚠️ 개수 제한 없음: 관련성 있는 모든 콘텐츠 통과               │
│  • Output: 관련성 검증 통과한 모든 콘텐츠 (개수 무제한)          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: Grounded Reason Generation (근거 기반 이유 생성)       │
│  ─────────────────────────────────────────────────────────────  │
│  • 프롬프트 구조:                                                │
│    "다음 콘텐츠 정보를 바탕으로 추천 이유를 작성하세요.          │
│     반드시 [학습목표], [과정소개], [학습대상] 필드의             │
│     실제 내용을 인용하여 작성하세요.                             │
│     인용 형식: '...라고 명시되어 있어...'"                       │
│  • 템플릿 기반 생성으로 hallucination 방지                       │
│  • Output: 콘텐츠 + 근거 기반 추천 이유                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 6: Fact Verification (사실 검증)                          │
│  ─────────────────────────────────────────────────────────────  │
│  • 추천 이유에서 인용된 내용이 실제 콘텐츠에 존재하는지 검증     │
│  • 검증 방법:                                                    │
│    1. 추천 이유에서 인용문 추출 (정규식)                         │
│    2. 해당 인용이 콘텐츠 필드에 실제 존재하는지 확인             │
│    3. 존재하지 않으면 해당 추천 제거                             │
│  • 예시:                                                         │
│    - 추천 이유: "Flutter 중급 과정으로..."                       │
│    - 콘텐츠: "목소리 훈련법"                                     │
│    - 검증 결과: ❌ "Flutter"가 콘텐츠에 없음 → 제거              │
│  • Output: 검증된 최종 패키지                                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 7: Package Assembly (패키지 조립)                         │
│  ─────────────────────────────────────────────────────────────  │
│  • 검증된 모든 콘텐츠로 최종 패키지 구성 (개수 무제한)           │
│  • 학습 경로 설계: 기초 → 중급 → 심화                            │
│  • 예산 및 차시 정보 제공 (필터링 아닌 정보 제공 목적)           │
│  • Output: 관련 있는 모든 콘텐츠가 포함된 최종 추천 패키지       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 상세 구현 설계

### 3.1 Stage 1: Intent Extraction

```typescript
interface SearchIntent {
  primaryKeywords: string[]      // 핵심 키워드: ["AI", "머신러닝", "딥러닝"]
  secondaryKeywords: string[]    // 보조 키워드: ["Python", "TensorFlow", "데이터"]
  domain: string                 // 도메인: "IT/개발"
  targetLevel: string            // 대상 레벨: "중급"
  exclusionKeywords: string[]    // 제외 키워드: ["물류", "마케팅", "음성"]
  technicalStack: string[]       // 기술 스택: ["Python", "PyTorch"]
}

const INTENT_EXTRACTION_PROMPT = `
사용자의 학습 요청을 분석하여 검색에 필요한 정보를 추출하세요.

## 사용자 요청
{userRequest}

## 추출 항목
1. primaryKeywords: 반드시 포함되어야 하는 핵심 키워드 (최대 5개)
2. secondaryKeywords: 관련된 보조 키워드 (최대 10개)
3. domain: IT/개발, 경영/관리, 마케팅, 디자인 중 선택
4. targetLevel: 입문, 초급, 중급, 고급 중 선택
5. exclusionKeywords: 명확히 관련 없는 분야 키워드
6. technicalStack: 특정 기술/도구가 언급된 경우

## JSON 형식으로 응답
`

async function extractSearchIntent(
  userRequest: string,
  collectedInfo: CollectedInfo
): Promise<SearchIntent> {
  const response = await generateChatCompletion([
    { role: 'system', content: '당신은 교육 콘텐츠 검색 전문가입니다.' },
    { role: 'user', content: INTENT_EXTRACTION_PROMPT.replace('{userRequest}', userRequest) }
  ], { model: 'gpt-4o', temperature: 0.1 })

  return JSON.parse(response)
}
```

### 3.2 Stage 2: Hard Filter

```typescript
async function hardFilter(intent: SearchIntent): Promise<Content[]> {
  // 핵심 키워드로 SQL 쿼리 생성
  const keywordConditions = intent.primaryKeywords.map(kw =>
    `(
      "courseName" ILIKE '%${kw}%' OR
      "courseIntro" ILIKE '%${kw}%' OR
      "learningObjective" ILIKE '%${kw}%' OR
      "majorCategory" ILIKE '%${kw}%' OR
      "middleCategory" ILIKE '%${kw}%' OR
      "minorCategory" ILIKE '%${kw}%'
    )`
  ).join(' OR ')

  // 제외 키워드 조건
  const exclusionConditions = intent.exclusionKeywords.map(kw =>
    `"courseName" NOT ILIKE '%${kw}%' AND "courseIntro" NOT ILIKE '%${kw}%'`
  ).join(' AND ')

  const contents = await prisma.$queryRawUnsafe<Content[]>(`
    SELECT * FROM "Content"
    WHERE (${keywordConditions})
    ${exclusionConditions ? `AND (${exclusionConditions})` : ''}
    ORDER BY "developmentYear" DESC NULLS LAST
    LIMIT 300
  `)

  return contents
}
```

### 3.3 Stage 3: Hybrid Scoring

```typescript
interface ScoredContent {
  content: Content
  scores: {
    keywordMatch: number      // 0-1: 키워드 매칭 점수
    vectorSimilarity: number  // 0-1: 벡터 유사도
    categoryRelevance: number // 0-1: 카테고리 관련성
    recencyScore: number      // 0-1: 최신성
    budgetFit: number         // 0-1: 예산 적합성
    totalScore: number        // 가중 합계
  }
  matchedKeywords: string[]   // 매칭된 키워드 목록
}

function calculateHybridScore(
  content: Content,
  intent: SearchIntent,
  queryEmbedding: number[],
  contentEmbedding: number[],
  budget: number | null
): ScoredContent {
  // 1. Keyword Match Score (35%)
  const contentText = `${content.courseName} ${content.courseIntro} ${content.learningObjective} ${content.majorCategory}`.toLowerCase()
  const matchedKeywords = intent.primaryKeywords.filter(kw =>
    contentText.includes(kw.toLowerCase())
  )
  const keywordMatch = matchedKeywords.length / intent.primaryKeywords.length

  // 2. Vector Similarity (25%)
  const vectorSimilarity = cosineSimilarity(queryEmbedding, contentEmbedding)

  // 3. Category Relevance (20%)
  const categoryRelevance = calculateCategoryRelevance(content, intent.domain)

  // 4. Recency Score (15%)
  const recencyScore = calculateRecencyScore(content.developmentYear)

  // 5. Budget Fit (5%)
  const budgetFit = calculateBudgetScore(content.educationFee, budget)

  // 가중 합계
  const totalScore =
    (keywordMatch * 0.35) +
    (vectorSimilarity * 0.25) +
    (categoryRelevance * 0.20) +
    (recencyScore * 0.15) +
    (budgetFit * 0.05)

  return {
    content,
    scores: { keywordMatch, vectorSimilarity, categoryRelevance, recencyScore, budgetFit, totalScore },
    matchedKeywords
  }
}

// 임계값 적용
const SCORE_THRESHOLD = 0.5
const filteredContents = scoredContents.filter(sc => sc.scores.totalScore >= SCORE_THRESHOLD)
```

### 3.4 Stage 4: LLM Relevance Validation

**핵심 원칙: 개수 제한 없이 관련 있는 모든 콘텐츠 추천**

```typescript
interface RelevanceResult {
  contentId: number
  relevanceScore: number  // 1-10
  isRelevant: boolean     // score >= 6
  reason: string          // 관련성 판단 이유
}

const RELEVANCE_VALIDATION_PROMPT = `
당신은 교육 콘텐츠 관련성 평가 전문가입니다.

## 사용자 학습 목표
{learningGoal}

## 평가할 콘텐츠 목록
{contentList}

## 평가 기준
각 콘텐츠에 대해 사용자의 학습 목표와의 관련성을 1-10점으로 평가하세요.
- 1-3점: 전혀 관련 없음
- 4-5점: 간접적 관련
- 6-7점: 관련 있음
- 8-10점: 매우 관련 있음

## 출력 형식 (JSON)
[
  {
    "contentId": 123,
    "relevanceScore": 8,
    "reason": "머신러닝 기초 과정으로 사용자의 학습 목표에 직접적으로 부합"
  },
  ...
]
`

async function validateRelevance(
  contents: ScoredContent[],
  learningGoal: string
): Promise<RelevanceResult[]> {
  const results: RelevanceResult[] = []

  // 10개씩 배치 처리 (컨텍스트 길이 관리)
  // ⚠️ 개수 제한 없음: 모든 후보 콘텐츠를 평가
  const BATCH_SIZE = 10
  for (let i = 0; i < contents.length; i += BATCH_SIZE) {
    const batch = contents.slice(i, i + BATCH_SIZE)

    const contentList = batch.map((sc, idx) => `
[${idx + 1}] ID: ${sc.content.id}
- 과정명: ${sc.content.courseName}
- 과정소개: ${sc.content.courseIntro || '없음'}
- 학습목표: ${sc.content.learningObjective || '없음'}
- 카테고리: ${sc.content.majorCategory} > ${sc.content.middleCategory}
    `).join('\n')

    const response = await generateChatCompletion([
      { role: 'system', content: '교육 콘텐츠 관련성을 평가합니다. JSON 형식으로만 응답하세요.' },
      { role: 'user', content: RELEVANCE_VALIDATION_PROMPT
        .replace('{learningGoal}', learningGoal)
        .replace('{contentList}', contentList)
      }
    ], { model: 'gpt-4o', temperature: 0.1 })  // 고품질 모델 사용

    const batchResults = JSON.parse(response)
    results.push(...batchResults.map((r: any) => ({
      ...r,
      isRelevant: r.relevanceScore >= 6
    })))
  }

  // ✅ 개수 제한 없이 관련성 있는 모든 콘텐츠 반환
  return results.filter(r => r.isRelevant)
}
```

### 3.5 Stage 5: Grounded Reason Generation

```typescript
const GROUNDED_REASON_PROMPT = `
당신은 교육 콘텐츠 추천 전문가입니다.

## 중요 규칙
1. 추천 이유는 반드시 콘텐츠의 실제 정보를 인용해야 합니다
2. 콘텐츠에 없는 내용을 상상하여 작성하지 마세요
3. 인용 형식: "이 과정은 '[실제 과정소개 인용]'으로..."

## 사용자 학습 목표
{learningGoal}

## 추천할 콘텐츠
과정명: {courseName}
과정소개: {courseIntro}
학습목표: {learningObjective}
학습대상: {targetAudience}
학습내용: {curriculum}

## 출력 형식
추천 이유를 2-3문장으로 작성하세요. 반드시 위 정보 중 하나 이상을 인용하세요.
`

interface GroundedRecommendation {
  contentId: number
  reason: string
  citations: string[]  // 인용된 원본 텍스트
}

async function generateGroundedReason(
  content: Content,
  learningGoal: string
): Promise<GroundedRecommendation> {
  const response = await generateChatCompletion([
    { role: 'system', content: '콘텐츠 정보를 정확히 인용하여 추천 이유를 작성합니다.' },
    { role: 'user', content: GROUNDED_REASON_PROMPT
      .replace('{learningGoal}', learningGoal)
      .replace('{courseName}', content.courseName)
      .replace('{courseIntro}', content.courseIntro || '정보 없음')
      .replace('{learningObjective}', content.learningObjective || '정보 없음')
      .replace('{targetAudience}', content.targetAudience || '정보 없음')
      .replace('{curriculum}', formatCurriculum(content.curriculum))
    }
  ], { model: 'gpt-4o', temperature: 0.3 })

  // 인용문 추출 (작은따옴표 또는 큰따옴표로 감싸진 텍스트)
  const citations = response.match(/['"]([^'"]+)['"]/g) || []

  return {
    contentId: content.id,
    reason: response,
    citations: citations.map(c => c.replace(/['"]/g, ''))
  }
}
```

### 3.6 Stage 6: Fact Verification

```typescript
interface VerificationResult {
  contentId: number
  reason: string
  isVerified: boolean
  failedCitations: string[]  // 검증 실패한 인용
}

function verifyRecommendation(
  recommendation: GroundedRecommendation,
  content: Content
): VerificationResult {
  const contentText = [
    content.courseName,
    content.courseIntro,
    content.learningObjective,
    content.targetAudience,
    formatCurriculum(content.curriculum)
  ].filter(Boolean).join(' ').toLowerCase()

  const failedCitations: string[] = []

  for (const citation of recommendation.citations) {
    // 인용이 콘텐츠에 실제로 존재하는지 확인
    // 유사도 기반 매칭 (정확한 일치가 아닐 수 있음)
    const citationLower = citation.toLowerCase()
    const isFound = contentText.includes(citationLower) ||
      calculateTextSimilarity(citationLower, contentText) > 0.8

    if (!isFound) {
      failedCitations.push(citation)
    }
  }

  // 추가 검증: Hallucination 탐지
  const hallucinations = detectHallucinations(recommendation.reason, content)
  failedCitations.push(...hallucinations)

  return {
    contentId: recommendation.contentId,
    reason: recommendation.reason,
    isVerified: failedCitations.length === 0,
    failedCitations
  }
}

function detectHallucinations(reason: string, content: Content): string[] {
  const hallucinations: string[] = []

  // 기술 스택 hallucination 탐지
  const techKeywords = ['Flutter', 'React', 'Vue', 'Angular', 'Python', 'Java', 'Node.js',
                        'TensorFlow', 'PyTorch', 'AWS', 'Docker', 'Kubernetes']

  for (const tech of techKeywords) {
    const inReason = reason.toLowerCase().includes(tech.toLowerCase())
    const inContent = [content.courseName, content.courseIntro, content.learningObjective]
      .filter(Boolean).join(' ').toLowerCase().includes(tech.toLowerCase())

    if (inReason && !inContent) {
      hallucinations.push(`${tech}가 추천 이유에 있지만 콘텐츠에 없음`)
    }
  }

  return hallucinations
}

// 검증 실패한 추천은 제거
const verifiedRecommendations = recommendations
  .map(rec => verifyRecommendation(rec, findContent(rec.contentId)))
  .filter(vr => vr.isVerified)
```

---

## 4. 개선된 폴백 전략

### 4.1 기존 폴백의 문제
```typescript
// ❌ 기존: 무조건 상위 20개 반환
catch {
  const selectedContents = candidateContents.slice(0, 20)
  // 관련성과 무관하게 반환
}
```

### 4.2 새로운 폴백 전략
```typescript
// ✅ 새로운 방식: 정직하게 상황 보고
async function handleRecommendationFailure(
  stage: string,
  error: Error,
  partialResults?: any
): Promise<RecommendationResponse> {
  console.error(`Recommendation failed at ${stage}:`, error)

  // 1. 부분 결과가 있으면 최선을 다해 반환
  if (partialResults?.verifiedContents?.length > 0) {
    return {
      success: true,
      partial: true,
      message: `일부 콘텐츠만 검증을 완료했습니다. (${partialResults.verifiedContents.length}개)`,
      recommendations: partialResults.verifiedContents
    }
  }

  // 2. Hard Filter 결과가 있으면 수동 검토 요청
  if (partialResults?.hardFilterResults?.length > 0) {
    return {
      success: false,
      requiresManualReview: true,
      message: '자동 추천에 실패했습니다. 다음 후보를 수동으로 검토해주세요.',
      candidates: partialResults.hardFilterResults.slice(0, 10)
    }
  }

  // 3. 관련 콘텐츠가 없음을 정직하게 반환
  return {
    success: false,
    message: '요청하신 조건에 맞는 콘텐츠를 찾지 못했습니다.',
    suggestion: '검색 조건을 조정하거나 다른 키워드로 시도해주세요.',
    alternatives: [
      '학습 목표를 더 구체적으로 입력해주세요',
      '관련 기술 스택을 명시해주세요',
      '예산 범위를 조정해보세요'
    ]
  }
}
```

---

## 5. 모델 선택 전략

### 5.1 단계별 모델 할당

| 단계 | 모델 | 이유 |
|------|------|------|
| Intent Extraction | gpt-4o | 정확한 키워드 추출 필요 |
| Relevance Validation | gpt-4o | 관련성 판단 품질 중요 |
| Reason Generation | gpt-4o | Hallucination 방지 |
| 일반 대화 | gpt-4o-mini | 비용 절감 |

### 5.2 비용 최적화 전략
```typescript
// 중요 단계에서만 고성능 모델 사용
const MODEL_CONFIG = {
  intentExtraction: { model: 'gpt-4o', temperature: 0.1 },
  relevanceValidation: { model: 'gpt-4o', temperature: 0.1 },
  reasonGeneration: { model: 'gpt-4o', temperature: 0.3 },
  generalChat: { model: 'gpt-4o-mini', temperature: 0.7 }
}
```

---

## 6. 성능 최적화

### 6.1 캐싱 전략
```typescript
// 1. Intent Extraction 결과 캐싱
const intentCache = new Map<string, SearchIntent>()

// 2. Embedding 캐싱 (기존 유지)
// ContentEmbedding 테이블 활용

// 3. Relevance Validation 결과 캐싱
// 동일 콘텐츠 + 유사 학습목표 = 캐시 히트
const relevanceCache = new Map<string, RelevanceResult>()
```

### 6.2 병렬 처리
```typescript
// Relevance Validation 병렬 처리
const BATCH_SIZE = 10
const PARALLEL_BATCHES = 3  // 동시에 3개 배치 처리

async function parallelValidation(contents: ScoredContent[]): Promise<RelevanceResult[]> {
  const batches = chunk(contents, BATCH_SIZE)
  const results: RelevanceResult[] = []

  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES)
    const batchResults = await Promise.all(
      parallelBatches.map(batch => validateRelevance(batch, learningGoal))
    )
    results.push(...batchResults.flat())
  }

  return results
}
```

---

## 7. 모니터링 및 품질 지표

### 7.1 추천 품질 지표
```typescript
interface RecommendationMetrics {
  // 파이프라인 성공률
  pipelineSuccessRate: number       // Stage 7까지 도달한 비율
  stageDropRates: Record<string, number>  // 각 단계별 탈락률

  // 품질 지표
  averageRelevanceScore: number     // 평균 관련성 점수 (6-10)
  verificationPassRate: number      // 사실 검증 통과율
  hallucinationRate: number         // Hallucination 탐지율

  // 사용자 피드백
  userSatisfactionScore: number     // 사용자 만족도 (1-5)
  packageEditRate: number           // 추천 후 수정 비율
}
```

### 7.2 로깅 및 디버깅
```typescript
// 각 단계 결과 로깅
async function logPipelineStage(
  stage: string,
  input: any,
  output: any,
  metrics: any
) {
  await prisma.recommendationLog.create({
    data: {
      sessionId,
      stage,
      inputCount: input.length,
      outputCount: output.length,
      metrics: JSON.stringify(metrics),
      timestamp: new Date()
    }
  })
}
```

---

## 8. 마이그레이션 계획

### Phase 1: 핵심 개선 (1주)
- [ ] Hard Filter 구현 (SQL 기반 키워드 필터링)
- [ ] 유사도 임계값 추가 (0.5 이상만 통과)
- [ ] gpt-4o-mini → gpt-4o 전환 (추천 생성 부분)

### Phase 2: LLM as Judge (1주)
- [ ] Relevance Validation 단계 구현
- [ ] 배치 처리 로직 구현
- [ ] 관련성 점수 임계값 적용

### Phase 3: Grounded Generation (1주)
- [ ] 인용 기반 추천 이유 생성 프롬프트
- [ ] Fact Verification 로직 구현
- [ ] Hallucination 자동 탐지

### Phase 4: 최적화 (1주)
- [ ] 캐싱 전략 적용
- [ ] 병렬 처리 구현
- [ ] 모니터링 대시보드

---

## 9. 예상 결과

### Before (현재 시스템)
```
요청: "AI 및 머신러닝 개발 역량 강화"
결과:
- "실전 구글 활용법" ❌
- "물류업 DT 트렌드" ❌
- "목소리 훈련법" ❌ + Hallucination 추천 이유
```

### After (새로운 시스템)
```
요청: "AI 및 머신러닝 개발 역량 강화"

Stage 1: 키워드 추출 → ["AI", "머신러닝", "딥러닝", "인공지능", "Python"]
Stage 2: Hard Filter → 300개 중 45개 통과 (키워드 매칭)
Stage 3: Hybrid Score → 45개 중 32개 통과 (score >= 0.5)
Stage 4: Relevance Validation → 32개 중 28개 통과 (score >= 6) ← 개수 제한 없음!
Stage 5: Grounded Reason → 28개 추천 이유 생성
Stage 6: Fact Verification → 28개 중 27개 검증 통과

최종 결과 (27개 - 관련 있는 모든 콘텐츠):
- "Python 기반 머신러닝 입문" ✅
  추천 이유: "이 과정은 '머신러닝의 기초 개념과 Python 구현'을 학습목표로 하고 있어..."
- "딥러닝 실전 프로젝트" ✅
  추천 이유: "과정소개에 명시된 'TensorFlow, PyTorch를 활용한 실습'이..."
- "AI 서비스 개발" ✅
  추천 이유: "학습대상이 '머신러닝 기초를 갖춘 개발자'로..."
```

---

## 10. 결론

현재 시스템의 근본적 문제는:
1. **Vector-only 검색**이 교육 콘텐츠 도메인에 부적합
2. **품질 검증 단계 부재**로 무관한 콘텐츠가 추천됨
3. **LLM Hallucination**이 방치되어 잘못된 추천 이유 생성
4. **고정된 추천 개수(20-25개)**로 인한 관련 콘텐츠 누락

새로운 시스템은:
1. **Hybrid Search**로 키워드 + 카테고리 + 벡터 조합
2. **Multi-Stage Validation**으로 각 단계별 품질 보장
3. **Grounded Generation + Fact Verification**으로 Hallucination 방지
4. **정직한 폴백**으로 관련 없는 콘텐츠 무작위 추천 방지
5. **개수 제한 없는 추천**으로 관련 있는 모든 콘텐츠 제공

### 핵심 정책: 추천 개수 무제한

```
기존: "20-25개를 추천해야 한다" → 무관한 콘텐츠도 채워 넣음
신규: "관련성 6점 이상만 추천한다" → 5개든 100개든 품질 기준으로만 결정
```

**이점:**
- 관련 콘텐츠가 많으면 많이 추천 (사용자 선택권 확대)
- 관련 콘텐츠가 적으면 적게 추천 (품질 보장)
- "목소리 훈련법"처럼 무관한 콘텐츠가 개수 채우기로 추천되는 일 방지

이 아키텍처를 통해 "목소리 훈련법"이 "AI 머신러닝" 요청에 추천되는 일이 없어질 것입니다.

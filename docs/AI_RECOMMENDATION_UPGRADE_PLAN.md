# AI 콘텐츠 추천 시스템 개선 계획서

## 📋 문서 정보

- **버전**: 1.0
- **작성일**: 2024-11-27
- **목적**: 현재 형편없는 추천 퀄리티를 대폭 개선하여 사용자 만족도 향상

---

## 🔴 현재 시스템 문제점 분석

### 1. 과정상세(courseIntro) 미활용 - 치명적 문제

**현재 코드 (`src/app/api/chat/message/route.ts:125`):**
```typescript
// 현재 검색 쿼리 생성 - 너무 단순함
const searchQuery = `${collectedInfo.learningGoal} ${collectedInfo.targetGroup} ${collectedInfo.skillLevel} ${collectedInfo.industry}`
```

**문제점:**
- `courseIntro` (과정상세) 필드를 검색에 전혀 활용하지 않음
- `learningObjective` (학습목표) 필드 미활용
- `targetAudience` (학습대상) 필드 미활용
- `curriculum` (학습내용/목차) 필드 미활용

### 2. 추천 콘텐츠 개수 부족

**현재 코드 (`src/app/api/chat/message/route.ts:189`):**
```typescript
// 현재: 5-8개만 추천
const prompt = `...위 후보 콘텐츠 중에서 사용자 요구사항에 가장 적합한 5-8개를 선택하여 패키지를 구성하세요.`
```

**요구사항:** 최소 20개 이상 추천 필요

### 3. 최신 강의 우선순위 없음

**미활용 필드:**
- `developmentYear` (개발연도) 필드가 있으나 추천 시 전혀 고려되지 않음
- 최신 강의 선호 로직 없음

### 4. 임베딩 생성 시 정보 부족

**현재 임베딩 생성 방식 (추정):**
```typescript
// 제한적인 정보만 사용
const text = `${content.courseName}\n${content.courseIntro || ''}\n${content.majorCategory} > ${content.middleCategory}`
```

**누락된 중요 필드:**
- `learningObjective` (학습목표)
- `targetAudience` (학습대상)
- `curriculum` (학습내용)
- `detailContent` (세부내용)
- `level0~level3` (난이도 레벨)

### 5. AI 프롬프트에 콘텐츠 정보 부족

**현재 후보 콘텐츠 포맷 (`src/app/api/chat/message/route.ts:170-176`):**
```typescript
const contentList = candidateContents.map((c, i) => `
[${i + 1}] ${c.courseName}
- ID: ${c.id}
- 카테고리: ${c.majorCategory} > ${c.middleCategory} > ${c.minorCategory}
- 차시: ${c.sessions}
- 교육비: ${c.educationFee}원
- 소개: ${c.courseIntro || '없음'}`).join('\n')
```

**누락된 정보:**
- `learningObjective` - AI가 사용자 학습목표와 매칭할 수 없음
- `targetAudience` - 대상 적합성 판단 불가
- `curriculum` - 실제 학습 내용 파악 불가
- `developmentYear` - 최신성 판단 불가

---

## 🟢 개선 방안

### Phase 1: 임베딩 품질 대폭 개선

#### 1.1 임베딩 텍스트 확장

**개선된 임베딩 생성 함수:**

```typescript
// src/lib/embedding-utils.ts (신규 파일)

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
    const curriculumText = Array.isArray(content.curriculum)
      ? content.curriculum.join(', ')
      : JSON.stringify(content.curriculum)
    parts.push(`학습내용: ${curriculumText}`)
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
```

#### 1.2 임베딩 재생성 스크립트

```typescript
// scripts/regenerate-embeddings.ts

import { prisma } from '@/lib/prisma'
import { generateEmbeddingsBatch } from '@/lib/openai'
import { generateContentText } from '@/lib/embedding-utils'

async function regenerateAllEmbeddings() {
  console.log('Starting embedding regeneration...')

  const contents = await prisma.content.findMany()
  console.log(`Found ${contents.length} contents`)

  const BATCH_SIZE = 50 // OpenAI 배치 제한

  for (let i = 0; i < contents.length; i += BATCH_SIZE) {
    const batch = contents.slice(i, i + BATCH_SIZE)

    // 확장된 텍스트 생성
    const texts = batch.map(c => generateContentText(c))

    // 임베딩 생성
    const embeddings = await generateEmbeddingsBatch(texts)

    // DB 저장
    for (let j = 0; j < batch.length; j++) {
      await prisma.contentEmbedding.upsert({
        where: { contentId: batch[j].id },
        create: {
          contentId: batch[j].id,
          embedding: JSON.stringify(embeddings[j]),
          embeddingModel: 'text-embedding-3-small'
        },
        update: {
          embedding: JSON.stringify(embeddings[j]),
          updatedAt: new Date()
        }
      })
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, contents.length)}/${contents.length}`)

    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('Embedding regeneration completed!')
}

regenerateAllEmbeddings()
```

### Phase 2: 검색 쿼리 개선

#### 2.1 스마트 검색 쿼리 생성

```typescript
// src/lib/search-utils.ts (신규 파일)

export function buildSmartSearchQuery(collectedInfo: CollectedInfo): string {
  const parts: string[] = []

  // 1. 학습 목표 (가장 중요)
  if (collectedInfo.learningGoal) {
    parts.push(`학습목표: ${collectedInfo.learningGoal}`)
  }

  // 2. 대상 정보 조합
  const targetParts: string[] = []
  if (collectedInfo.targetGroup) targetParts.push(collectedInfo.targetGroup)
  if (collectedInfo.jobLevel) targetParts.push(collectedInfo.jobLevel)
  if (collectedInfo.skillLevel) targetParts.push(`${collectedInfo.skillLevel} 수준`)

  if (targetParts.length > 0) {
    parts.push(`학습대상: ${targetParts.join(' ')}`)
  }

  // 3. 산업/분야
  if (collectedInfo.industry) {
    parts.push(`산업분야: ${collectedInfo.industry}`)
  }

  // 4. 추가 컨텍스트
  if (collectedInfo.company) {
    parts.push(`기업: ${collectedInfo.company}`)
  }

  return parts.join('\n')
}
```

### Phase 3: 추천 개수 및 최신성 반영

#### 3.1 개선된 추천 로직

```typescript
// src/app/api/chat/message/route.ts 개선안

async function generateRecommendations(collectedInfo: CollectedInfo) {
  // 1. 스마트 검색 쿼리 생성
  const searchQuery = buildSmartSearchQuery(collectedInfo)
  const queryEmbedding = await generateEmbedding(searchQuery)

  // 2. 모든 콘텐츠와 유사도 계산
  const contentsWithEmbeddings = await prisma.contentEmbedding.findMany({
    include: { content: true }
  })

  // 3. 점수 계산 (유사도 + 최신성 + 예산 적합성)
  const scoredContents = contentsWithEmbeddings.map(ce => {
    const embeddingArray = JSON.parse(ce.embedding) as number[]
    const similarity = cosineSimilarity(queryEmbedding, embeddingArray)

    // 최신성 점수 (2024년 = 1.0, 2023년 = 0.9, 2022년 = 0.8, ...)
    const currentYear = new Date().getFullYear()
    const devYear = parseInt(ce.content.developmentYear || '2020')
    const recencyScore = Math.max(0, 1 - (currentYear - devYear) * 0.1)

    // 예산 적합성 점수
    const budget = collectedInfo.budget || Infinity
    const budgetScore = ce.content.educationFee <= budget ? 1.0 :
                        ce.content.educationFee <= budget * 1.1 ? 0.8 :
                        ce.content.educationFee <= budget * 1.2 ? 0.6 : 0.3

    // 종합 점수: 유사도 50% + 최신성 30% + 예산적합성 20%
    const totalScore = (similarity * 0.5) + (recencyScore * 0.3) + (budgetScore * 0.2)

    return {
      content: ce.content,
      similarity,
      recencyScore,
      budgetScore,
      totalScore
    }
  })

  // 4. 상위 60개 후보 추출 (AI에게 더 많은 선택지 제공)
  const candidates = scoredContents
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 60)

  // 5. AI에게 상세 정보와 함께 전달
  const contentList = candidates.map((sc, i) => `
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

  // 6. 개선된 프롬프트
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

  return await generateChatCompletion([
    { role: 'system', content: '당신은 교육 콘텐츠 추천 전문가입니다. JSON 형식으로만 응답하세요.' },
    { role: 'user', content: prompt }
  ])
}

function formatCurriculum(curriculum: any): string {
  if (!curriculum) return '없음'
  if (Array.isArray(curriculum)) {
    return curriculum.slice(0, 5).join(', ') + (curriculum.length > 5 ? '...' : '')
  }
  return JSON.stringify(curriculum).slice(0, 200)
}
```

### Phase 4: 개선된 프롬프트 시스템

#### 4.1 새로운 추천 프롬프트

```typescript
// src/lib/prompts/system.ts 에 추가

export const IMPROVED_RECOMMENDATION_PROMPT = `당신은 Touch Contents의 AI 교육 콘텐츠 추천 전문가입니다.

## 핵심 미션
사용자의 학습 목표와 가장 잘 맞는 콘텐츠를 **과정상세(학습목표, 학습대상, 과정소개)** 기반으로 정밀 매칭합니다.

## 필수 선정 기준 (우선순위 순)

### 1. 과정 내용 매칭 (가중치: 45%)
- 사용자 학습목표 ↔ 콘텐츠 학습목표 일치도
- 사용자 요구 역량 ↔ 콘텐츠 과정소개 내용 일치도
- 키워드 매칭: 사용자가 언급한 기술/스킬이 과정에 포함되어 있는지

### 2. 대상 적합성 (가중치: 25%)
- 학습대상 필드가 사용자 직군/직급과 일치하는지
- 스킬 레벨이 사용자의 현재 레벨에 적합한지
- 입문자에게 고급 과정 추천 금지

### 3. 최신성 (가중치: 15%)
- 2024년 콘텐츠 최우선
- 2023년 콘텐츠 차선
- 2022년 이전은 내용이 매우 적합할 때만 선택

### 4. 예산/차시 적합성 (가중치: 10%)
- 총 교육비 예산 ±15% 이내
- 교육 기간에 맞는 총 차시 구성

### 5. 다양성 및 체계성 (가중치: 5%)
- 동일 중분류 5개 이상 선택 지양
- 기초 → 중급 → 심화 학습 경로 구성

## 추천 개수
- **최소 20개, 최대 25개** 콘텐츠 선택 필수
- 20개 미만 추천 금지

## 선정 이유 작성 규칙
각 콘텐츠마다 다음을 반드시 포함:
1. 사용자의 어떤 학습목표와 매칭되는지
2. 콘텐츠의 어떤 내용이 적합한지
3. 왜 이 순서에 배치했는지 (기초/심화 등)

## 출력 형식
반드시 아래 JSON 형식으로만 출력:
{
  "packageName": "패키지 이름",
  "description": "패키지 설명 (학습 경로 포함)",
  "selectedContents": [
    {
      "contentId": 콘텐츠ID(숫자),
      "order": 순서(숫자, 1-25),
      "reason": "선정 이유 (학습목표 매칭 + 적합성 설명, 2-3문장)",
      "score": 점수(0-100),
      "matchingPoints": ["매칭포인트1", "매칭포인트2"]
    }
  ],
  "summary": {
    "totalFee": 총교육비(숫자),
    "totalSessions": 총차시수(숫자),
    "estimatedDuration": "예상 기간",
    "latestContentRatio": "최신콘텐츠비율 (예: 70%가 2023년 이후)"
  },
  "learningPath": {
    "foundation": [입문/기초 콘텐츠 ID 배열],
    "intermediate": [중급 콘텐츠 ID 배열],
    "advanced": [심화 콘텐츠 ID 배열]
  },
  "budgetNote": "예산 대비 설명"
}`
```

---

## 📊 구현 우선순위

### 즉시 구현 (1-2일)

| 순위 | 작업 | 영향도 | 난이도 |
|------|------|--------|--------|
| 1 | 프롬프트에 과정상세 필드 추가 | 매우 높음 | 낮음 |
| 2 | 추천 개수 20개로 변경 | 높음 | 매우 낮음 |
| 3 | 개발연도 정보 프롬프트에 추가 | 높음 | 낮음 |

### 단기 구현 (3-5일)

| 순위 | 작업 | 영향도 | 난이도 |
|------|------|--------|--------|
| 4 | 임베딩 텍스트 확장 함수 구현 | 매우 높음 | 중간 |
| 5 | 전체 콘텐츠 임베딩 재생성 | 매우 높음 | 중간 |
| 6 | 복합 스코어링 로직 구현 | 높음 | 중간 |

### 중기 구현 (1-2주)

| 순위 | 작업 | 영향도 | 난이도 |
|------|------|--------|--------|
| 7 | 학습 경로 자동 구성 로직 | 중간 | 높음 |
| 8 | 추천 결과 피드백 시스템 | 중간 | 높음 |
| 9 | A/B 테스트 기반 알고리즘 개선 | 중간 | 높음 |

---

## 🔧 즉시 적용 가능한 코드 변경

### 변경 1: route.ts 프롬프트 개선

**파일:** `src/app/api/chat/message/route.ts`

**변경 위치:** 170-176번 줄

**Before:**
```typescript
const contentList = candidateContents.map((c, i) => `
[${i + 1}] ${c.courseName}
- ID: ${c.id}
- 카테고리: ${c.majorCategory} > ${c.middleCategory} > ${c.minorCategory}
- 차시: ${c.sessions}
- 교육비: ${c.educationFee}원
- 소개: ${c.courseIntro || '없음'}`).join('\n')
```

**After:**
```typescript
const contentList = candidateContents.map((c, i) => `
[${i + 1}] ${c.courseName}
- ID: ${c.id}
- 카테고리: ${c.majorCategory} > ${c.middleCategory} > ${c.minorCategory}
- 차시: ${c.sessions}
- 교육비: ${c.educationFee}원
- 개발연도: ${c.developmentYear || '미상'}
- 과정소개: ${c.courseIntro || '없음'}
- 학습목표: ${c.learningObjective || '없음'}
- 학습대상: ${c.targetAudience || '없음'}
- 학습내용: ${formatCurriculum(c.curriculum)}`).join('\n')

function formatCurriculum(curriculum: any): string {
  if (!curriculum) return '없음'
  if (Array.isArray(curriculum)) {
    return curriculum.slice(0, 5).join(', ') + (curriculum.length > 5 ? '...' : '')
  }
  return JSON.stringify(curriculum).slice(0, 200)
}
```

### 변경 2: 추천 개수 20개로 변경

**파일:** `src/app/api/chat/message/route.ts`

**변경 위치:** 189번 줄

**Before:**
```typescript
위 후보 콘텐츠 중에서 사용자 요구사항에 가장 적합한 5-8개를 선택하여 패키지를 구성하세요.
```

**After:**
```typescript
위 후보 콘텐츠 중에서 사용자 요구사항에 가장 적합한 **20-25개**를 선택하여 패키지를 구성하세요.
최신 콘텐츠(2023-2024년 개발)를 우선적으로 선택하고, 과정소개/학습목표가 사용자 요구사항과 일치하는 콘텐츠를 선택하세요.
```

### 변경 3: 후보 콘텐츠 수 확대

**파일:** `src/app/api/chat/message/route.ts`

**변경 위치:** 155번 줄

**Before:**
```typescript
.slice(0, 30) // Get top 30 for AI to select from
```

**After:**
```typescript
.slice(0, 60) // Get top 60 for AI to select 20-25 from
```

---

## 📈 기대 효과

### 정량적 개선

| 지표 | 현재 | 개선 후 목표 |
|------|------|--------------|
| 추천 콘텐츠 수 | 5-8개 | 20-25개 |
| 과정상세 활용률 | 0% | 100% |
| 최신 콘텐츠 비율 | 무작위 | 70%+ (2023-2024) |
| 학습목표 매칭 정확도 | 낮음 | 80%+ |

### 정성적 개선

1. **사용자 만족도 향상**: 과정상세 기반 정밀 매칭으로 관련성 높은 추천
2. **최신 트렌드 반영**: 최신 개발 콘텐츠 우선 추천
3. **충분한 선택지 제공**: 20개 이상 추천으로 다양한 학습 경로 구성 가능
4. **학습 체계성**: 입문→기초→심화 순서의 체계적 학습 경로

---

## 🧪 테스트 계획

### 테스트 시나리오

1. **기본 테스트**: "React 프론트엔드 개발자 교육" 요청 시 React 관련 과정 20개+ 추천 확인
2. **최신성 테스트**: 추천 결과 중 2023-2024년 콘텐츠가 70% 이상인지 확인
3. **매칭 테스트**: 추천 콘텐츠의 학습목표가 사용자 요구와 일치하는지 확인
4. **다양성 테스트**: 동일 카테고리 과다 편중 없는지 확인

### 품질 체크리스트

- [ ] 추천 결과가 20개 이상인가?
- [ ] 각 추천에 구체적인 선정 이유가 포함되어 있는가?
- [ ] 최신 콘텐츠가 우선 배치되어 있는가?
- [ ] 학습 경로가 체계적으로 구성되어 있는가?
- [ ] 예산 범위를 준수하고 있는가?

---

## 📝 다음 단계

1. **즉시**: 위 코드 변경 적용
2. **이번 주**: 임베딩 재생성 스크립트 실행
3. **다음 주**: 복합 스코어링 로직 구현
4. **2주 후**: 사용자 피드백 수집 및 알고리즘 튜닝

---

## 📌 문서 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2024-11-27 | 초안 작성 |

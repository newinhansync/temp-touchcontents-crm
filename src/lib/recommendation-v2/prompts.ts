/**
 * AI 콘텐츠 추천 시스템 V2 프롬프트
 * 각 단계별 전문화된 프롬프트
 */

// Stage 1: Intent Extraction Prompt
export const INTENT_EXTRACTION_PROMPT = `사용자의 학습 요청을 분석하여 검색에 필요한 정보를 추출하세요.

## 사용자 요청
{userRequest}

## 추가 컨텍스트
- 산업군: {industry}
- 직군: {targetGroup}
- 직급: {jobLevel}
- 스킬 레벨: {skillLevel}

## 추출 항목
1. primaryKeywords: 반드시 포함되어야 하는 핵심 키워드 (최대 5개)
   - 사용자의 학습 목표에서 핵심 기술/역량 추출
   - 예: "AI 및 머신러닝 개발" → ["AI", "머신러닝", "딥러닝", "인공지능"]

2. secondaryKeywords: 관련된 보조 키워드 (최대 10개)
   - 핵심 키워드와 관련된 기술, 도구, 방법론
   - 예: ["Python", "TensorFlow", "PyTorch", "데이터분석", "모델링"]

3. domain: 주요 도메인 (하나만 선택)
   - IT/개발, 경영/관리, 마케팅, 디자인, 금융/회계, 인사/조직, 영업/고객 중 선택

4. targetLevel: 대상 레벨
   - 입문, 초급, 중급, 고급 중 선택

5. exclusionKeywords: 명확히 관련 없는 분야 키워드 (최대 10개)
   - 사용자 요청과 무관한 분야를 명시적으로 제외
   - 예: IT 개발 요청이면 → ["물류", "영업", "마케팅", "재무", "회계"]

6. technicalStack: 특정 기술/도구가 언급된 경우 (최대 5개)
   - 사용자가 명시적으로 언급한 기술 스택
   - 예: ["Python", "React", "AWS"]

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "primaryKeywords": ["키워드1", "키워드2"],
  "secondaryKeywords": ["키워드1", "키워드2"],
  "domain": "도메인",
  "targetLevel": "레벨",
  "exclusionKeywords": ["키워드1", "키워드2"],
  "technicalStack": ["기술1", "기술2"]
}`

// Stage 4: Relevance Validation Prompt
export const RELEVANCE_VALIDATION_PROMPT = `당신은 교육 콘텐츠 관련성 평가 전문가입니다.

## 사용자 학습 목표
{learningGoal}

## 사용자 컨텍스트
- 직군: {targetGroup}
- 직급: {jobLevel}
- 스킬 레벨: {skillLevel}
- 산업군: {industry}

## 평가할 콘텐츠 목록
{contentList}

## 평가 기준
각 콘텐츠에 대해 사용자의 학습 목표와의 관련성을 1-10점으로 평가하세요.

### 점수 기준
- 1-3점: 전혀 관련 없음
  - 학습 목표와 완전히 다른 분야
  - 대상자가 맞지 않음
  - 키워드 일치 없음

- 4-5점: 간접적 관련
  - 일부 개념이 겹치지만 직접적이지 않음
  - 배경 지식으로는 유용할 수 있음

- 6-7점: 관련 있음
  - 학습 목표와 직접적으로 연결됨
  - 핵심 키워드 일치
  - 대상자 적합

- 8-10점: 매우 관련 있음
  - 학습 목표를 직접적으로 달성하는 데 도움
  - 여러 핵심 키워드 일치
  - 난이도와 대상자 완벽 적합

### 평가 시 주의사항
1. 과정명만 보지 말고 과정소개, 학습목표, 학습대상을 꼼꼼히 확인
2. "역량 강화", "능력 개발" 같은 일반적 표현에 속지 말 것
3. 실제 콘텐츠 내용이 사용자의 구체적 목표와 맞는지 판단
4. 사용자 스킬 레벨에 맞지 않는 난이도는 점수 깎을 것

## 출력 형식 (JSON)
[
  {
    "contentId": 123,
    "relevanceScore": 8,
    "reason": "머신러닝 기초 과정으로 사용자의 학습 목표에 직접적으로 부합. 학습대상이 '개발자'로 명시되어 있고, Python 기반 실습 포함."
  }
]`

// Stage 5: Grounded Reason Generation Prompt
export const GROUNDED_REASON_PROMPT = `당신은 교육 콘텐츠 추천 전문가입니다.

## 중요 규칙
1. 추천 이유는 반드시 콘텐츠의 실제 정보를 인용해야 합니다
2. 콘텐츠에 없는 내용을 상상하여 작성하지 마세요
3. 인용 형식: "이 과정은 '[실제 과정소개 인용]'으로..."
4. 반드시 아래 제공된 콘텐츠 정보 내에서만 인용하세요

## 사용자 학습 목표
{learningGoal}

## 추천할 콘텐츠
과정명: {courseName}
과정소개: {courseIntro}
학습목표: {learningObjective}
학습대상: {targetAudience}
학습내용: {curriculum}
카테고리: {category}

## 출력 형식
추천 이유를 2-3문장으로 작성하세요. 반드시 위 정보 중 하나 이상을 인용하세요.

예시:
"이 과정은 학습목표에 명시된 '파이썬을 활용한 데이터 분석 기초'를 다루며, 사용자의 데이터 분석 역량 개발 목표와 직접적으로 연결됩니다. 학습대상이 '데이터 분석 입문자'로 사용자의 현재 스킬 레벨에 적합합니다."`

// Stage 7: Package Assembly Prompt
export const PACKAGE_ASSEMBLY_PROMPT = `검증된 콘텐츠 목록을 바탕으로 최적의 학습 패키지를 구성하세요.

## 사용자 정보
- 기업: {company}
- 대상: {targetGroup}
- 학습 목표: {learningGoal}
- 스킬 레벨: {skillLevel}
- 예산: {budget}원

## 검증된 콘텐츠 목록 (관련성 점수 6점 이상)
{verifiedContents}

## 패키지 구성 원칙
1. 학습 경로 설계: 기초 → 중급 → 심화 순서
2. 모든 검증된 콘텐츠 포함 (개수 제한 없음)
3. 총 교육비와 예산 비교 정보 제공

## 출력 형식 (JSON)
{
  "packageName": "패키지 이름",
  "description": "패키지 설명 (학습 경로 포함)",
  "learningPath": {
    "foundation": [기초 콘텐츠 ID 배열],
    "intermediate": [중급 콘텐츠 ID 배열],
    "advanced": [심화 콘텐츠 ID 배열]
  },
  "budgetNote": "예산 대비 설명"
}`

// Helper: Format content for relevance validation
export function formatContentForValidation(content: {
  id: number
  courseName: string
  courseIntro?: string | null
  learningObjective?: string | null
  targetAudience?: string | null
  majorCategory?: string
  middleCategory?: string
}, index: number): string {
  return `
[${index + 1}] ID: ${content.id}
- 과정명: ${content.courseName}
- 과정소개: ${content.courseIntro || '없음'}
- 학습목표: ${content.learningObjective || '없음'}
- 학습대상: ${content.targetAudience || '없음'}
- 카테고리: ${content.majorCategory} > ${content.middleCategory}`
}

// Helper: Build intent extraction prompt with context
export function buildIntentExtractionPrompt(
  learningGoal: string,
  context: {
    industry?: string | null
    targetGroup?: string | null
    jobLevel?: string | null
    skillLevel?: string | null
  }
): string {
  return INTENT_EXTRACTION_PROMPT
    .replace('{userRequest}', learningGoal)
    .replace('{industry}', context.industry || '미지정')
    .replace('{targetGroup}', context.targetGroup || '미지정')
    .replace('{jobLevel}', context.jobLevel || '미지정')
    .replace('{skillLevel}', context.skillLevel || '미지정')
}

// Helper: Build relevance validation prompt
export function buildRelevanceValidationPrompt(
  learningGoal: string,
  context: {
    targetGroup?: string | null
    jobLevel?: string | null
    skillLevel?: string | null
    industry?: string | null
  },
  contentList: string
): string {
  return RELEVANCE_VALIDATION_PROMPT
    .replace('{learningGoal}', learningGoal)
    .replace('{targetGroup}', context.targetGroup || '미지정')
    .replace('{jobLevel}', context.jobLevel || '미지정')
    .replace('{skillLevel}', context.skillLevel || '미지정')
    .replace('{industry}', context.industry || '미지정')
    .replace('{contentList}', contentList)
}

// Helper: Build grounded reason prompt
export function buildGroundedReasonPrompt(
  learningGoal: string,
  content: {
    courseName: string
    courseIntro?: string | null
    learningObjective?: string | null
    targetAudience?: string | null
    curriculum?: unknown
    majorCategory?: string
    middleCategory?: string
  }
): string {
  const formatCurriculum = (curriculum: unknown): string => {
    if (!curriculum) return '없음'
    if (Array.isArray(curriculum)) return curriculum.slice(0, 5).join(', ')
    if (typeof curriculum === 'string') return curriculum.slice(0, 200)
    return JSON.stringify(curriculum).slice(0, 200)
  }

  return GROUNDED_REASON_PROMPT
    .replace('{learningGoal}', learningGoal)
    .replace('{courseName}', content.courseName)
    .replace('{courseIntro}', content.courseIntro || '정보 없음')
    .replace('{learningObjective}', content.learningObjective || '정보 없음')
    .replace('{targetAudience}', content.targetAudience || '정보 없음')
    .replace('{curriculum}', formatCurriculum(content.curriculum))
    .replace('{category}', `${content.majorCategory} > ${content.middleCategory}`)
}

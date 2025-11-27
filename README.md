# Touch Contents CRM

AI 기반 교육 콘텐츠 추천 및 관리 시스템

## 시스템 개요

Touch Contents CRM은 기업 교육 담당자를 위한 AI 기반 콘텐츠 추천 시스템입니다. 대화형 인터페이스를 통해 교육 요구사항을 수집하고, 3,300개 이상의 교육 콘텐츠 데이터베이스에서 최적의 콘텐츠를 추천합니다.

### 핵심 특징
- **대화형 요구사항 수집**: AI 챗봇이 자연스러운 대화로 8가지 필수 정보를 수집
- **검증 기반 다단계 추천 파이프라인 (VMSRP)**: 7단계 검증 프로세스로 정확한 추천 보장
- **Hallucination 방지**: 사실 검증을 통해 AI의 잘못된 정보 생성 차단
- **품질 우선 추천**: 개수 제한 없이 관련성이 검증된 모든 콘텐츠 추천

---

## 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크 (App Router)
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 기반 CSS 프레임워크
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트
- **Lucide React** - 아이콘 라이브러리

### Backend
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Prisma ORM** - 타입 안전 데이터베이스 ORM
- **PostgreSQL** - 관계형 데이터베이스

### AI / ML
- **OpenAI GPT-4o** - 의도 추출, 관련성 검증, 추천 이유 생성
- **OpenAI GPT-4o-mini** - 일반 대화 처리
- **OpenAI text-embedding-3-small** - 콘텐츠 벡터 임베딩
- **JSON-based Vector Storage** - 콘텐츠 임베딩 저장 및 코사인 유사도 계산

---

## 주요 기능

### 1. 콘텐츠 관리 (/)
- 전체 콘텐츠 목록 조회 (테이블/카드 뷰)
- 다중 필터 및 검색 기능
- Excel 내보내기
- 콘텐츠 상세 정보 조회

### 2. AI 콘텐츠 추천 (/packages/new)
- AI 챗봇 기반 요구사항 수집
- 8가지 필수 정보 자동 수집:
  - 기업명, 산업분야, 교육인원
  - 교육대상 (직군/부서), 직급/레벨, 스킬레벨
  - 학습목표, 교육기간
- **검증 기반 다단계 추천 파이프라인 (VMSRP)** 적용
- 학습 경로 자동 구성 (기초 → 중급 → 심화)

### 3. 패키지 관리 (/packages/list)
- 생성된 패키지 목록 조회
- 상태별 필터링 (활성/보관)
- 패키지 상세 정보 및 추천 콘텐츠 확인
- 패키지 보관/삭제 기능

---

## AI 추천 시스템 아키텍처 (VMSRP)

### 개념: 검증 기반 다단계 추천 파이프라인

**VMSRP (Validation-based Multi-Stage Recommendation Pipeline)**는 기존 벡터 검색만으로는 해결할 수 없는 교육 콘텐츠 추천의 근본적인 문제를 해결하기 위해 설계되었습니다.

#### 기존 시스템의 문제점
```
요청: "AI 및 머신러닝 개발 역량 강화"

기존 시스템 결과 (문제):
1. "실전 구글 활용법" → 완전히 무관
2. "물류업 DT 트렌드" → 무관
3. "목소리 훈련법" → 무관 + Hallucination 추천 이유
   추천 이유: "Flutter 중급 과정으로..." (실제 콘텐츠와 불일치)
```

**근본 원인:**
- 벡터 유사도만으로 검색 시 "역량", "개발" 같은 일반적 단어가 모든 교육 콘텐츠와 매칭
- 품질 검증 단계 부재로 무관한 콘텐츠가 추천됨
- LLM이 콘텐츠 내용을 무시하고 상상으로 추천 이유 생성 (Hallucination)

---

### 7단계 파이프라인 구조

```
사용자 요청: "AI 및 머신러닝 개발 역량 강화"
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 1: Intent Extraction (의도 추출)               │
│ ─────────────────────────────────────────────────── │
│ • GPT-4o로 핵심 키워드 추출                          │
│ • Output:                                            │
│   - primaryKeywords: ["AI", "머신러닝", "딥러닝"]    │
│   - domain: "IT/개발"                                │
│   - exclusionKeywords: ["물류", "마케팅"]            │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 2: Hard Filter (SQL 규칙 기반 필터링)          │
│ ─────────────────────────────────────────────────── │
│ • SQL WHERE로 키워드 미포함 콘텐츠 완전 제거         │
│ • 제외 키워드 포함 콘텐츠 필터링                     │
│ • 결과: 3,300개 → ~100-300개                        │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 3: Hybrid Scoring (복합 점수 계산)             │
│ ─────────────────────────────────────────────────── │
│ 가중치 배분:                                         │
│   - 키워드 매칭 (40%): 핵심 키워드 포함 여부         │
│   - 벡터 유사도 (25%): 의미적 유사성                 │
│   - 카테고리 관련성 (20%): 도메인 일치도             │
│   - 최신성 (15%): 개발연도 기반                      │
│ Threshold: totalScore >= 0.5                         │
│ • 결과: ~30-50개                                     │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 4: LLM Relevance Validation (LLM 관련성 검증)  │
│ ─────────────────────────────────────────────────── │
│ • GPT-4o가 각 콘텐츠의 관련성을 1-10점으로 평가      │
│ • 10개씩 배치 처리                                   │
│ • Threshold: relevanceScore >= 6                     │
│ • 개수 제한 없음: 관련 있는 모든 콘텐츠 통과         │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 5: Grounded Reason Generation (근거 기반 생성) │
│ ─────────────────────────────────────────────────── │
│ • 실제 콘텐츠 정보를 인용하여 추천 이유 작성         │
│ • 형식: "이 과정은 '[실제 과정소개]'으로..."         │
│ • Hallucination 방지를 위한 강제 인용 규칙           │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 6: Fact Verification (사실 검증)               │
│ ─────────────────────────────────────────────────── │
│ • 추천 이유의 인용이 실제 콘텐츠에 존재하는지 검증   │
│ • 기술 키워드 Hallucination 탐지                     │
│   예: "Flutter"가 추천 이유에 있지만 콘텐츠에 없음   │
│ • 검증 실패 시 해당 추천 제거                        │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ Stage 7: Package Assembly (패키지 조립)              │
│ ─────────────────────────────────────────────────── │
│ • 검증된 모든 콘텐츠로 최종 패키지 구성              │
│ • 학습 경로 설계: 기초 → 중급 → 심화                 │
│ • DB 저장 및 결과 반환                               │
└──────────────────────────────────────────────────────┘
```

---

### 핵심 설계 원칙

| 원칙 | 기존 시스템 | VMSRP (새 시스템) |
|------|------------|------------------|
| 검색 전략 | Vector-only | Hybrid (Keyword + Category + Vector) |
| 품질 관리 | 없음 | 각 단계별 임계값과 검증 |
| LLM 역할 | 선택 + 이유 생성 | 검증자(Judge) + 근거 기반 생성 |
| Hallucination | 방치 | 자동 탐지 및 제거 |
| 추천 개수 | 20-25개 고정 | 개수 제한 없음 (품질 기준) |

### 품질 우선 추천 정책

```typescript
// 기존: 개수 제한으로 무관한 콘텐츠도 포함
const recommendations = candidateContents.slice(0, 25)

// VMSRP: 관련성 기준으로만 필터링
const recommendations = validatedContents.filter(c => c.relevanceScore >= 6)
// 결과: 10개일 수도, 50개일 수도, 100개일 수도 있음
```

**예상 결과:**
| 요청 | 관련 콘텐츠 수 | 추천 결과 |
|------|--------------|----------|
| "AI 머신러닝 개발" | ~80개 | 80개 모두 추천 |
| "React 프론트엔드" | ~45개 | 45개 모두 추천 |
| "양자컴퓨팅 고급" | ~5개 | 5개만 추천 (정직하게) |

---

### 파이프라인 메트릭스

각 단계별 처리 결과를 추적하여 추천 품질 모니터링:

```typescript
pipelineMetrics: {
  stage1_intentExtraction: number  // 추출된 키워드 수
  stage2_hardFilter: number        // 필터링 후 남은 콘텐츠 수
  stage3_hybridScoring: number     // 점수 임계값 통과 수
  stage4_relevanceValidation: number // 관련성 검증 통과 수
  stage5_reasonGeneration: number  // 이유 생성 완료 수
  stage6_factVerification: number  // 사실 검증 통과 수
  stage7_finalPackage: number      // 최종 패키지 콘텐츠 수
}
```

---

## 환경 설정

### 필수 요구사항
- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key (GPT-4o 접근 필요)

### 환경 변수 (.env)

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/touchcontents_crm?schema=public"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma db push

# Prisma 클라이언트 생성
npx prisma generate

# 개발 서버 실행
npm run dev
```

### 임베딩 재생성 (선택)

콘텐츠 임베딩을 향상된 텍스트(과정소개, 학습목표, 학습대상, 커리큘럼 포함)로 재생성하려면:

```bash
npx tsx scripts/regenerate-embeddings.ts
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── start/route.ts      # 챗 세션 시작
│   │   │   └── message/route.ts    # 메시지 처리 및 V2 추천 호출
│   │   ├── contents/
│   │   │   ├── route.ts            # 콘텐츠 목록
│   │   │   ├── [id]/route.ts       # 콘텐츠 상세
│   │   │   ├── filters/route.ts    # 필터 옵션
│   │   │   └── export/route.ts     # Excel 내보내기
│   │   └── packages/
│   │       ├── route.ts            # 패키지 목록
│   │       ├── [id]/route.ts       # 패키지 CRUD
│   │       └── stats/route.ts      # 통계
│   ├── packages/
│   │   ├── page.tsx                # AI 추천 메인
│   │   ├── new/page.tsx            # AI 챗 인터페이스
│   │   ├── list/page.tsx           # 패키지 목록
│   │   └── [id]/page.tsx           # 패키지 상세
│   ├── layout.tsx
│   └── page.tsx                    # 콘텐츠 관리 메인
├── components/
│   ├── layout/
│   │   ├── main-layout.tsx         # 메인 레이아웃
│   │   └── sidebar.tsx             # 사이드바 네비게이션
│   ├── ui/                         # shadcn/ui 컴포넌트
│   ├── data-table/                 # 데이터 테이블 컴포넌트
│   └── filters/                    # 필터 컴포넌트
├── lib/
│   ├── prisma.ts                   # Prisma 클라이언트
│   ├── openai.ts                   # OpenAI 서비스 (임베딩, 채팅)
│   ├── embedding-utils.ts          # 임베딩 생성 유틸리티
│   ├── search-utils.ts             # 스마트 검색 쿼리 유틸리티
│   ├── recommendation-v2/          # VMSRP 추천 시스템 V2
│   │   ├── index.ts                # 메인 진입점
│   │   ├── pipeline.ts             # 7단계 파이프라인 구현
│   │   ├── types.ts                # 타입 정의 및 설정
│   │   └── prompts.ts              # 각 단계별 프롬프트
│   └── prompts/
│       └── system.ts               # AI 대화 시스템 프롬프트
├── scripts/
│   └── regenerate-embeddings.ts    # 임베딩 재생성 스크립트
└── prisma/
    └── schema.prisma               # 데이터베이스 스키마
```

---

## 데이터베이스 스키마

### 주요 모델

- **Content**: 교육 콘텐츠 정보 (과정소개, 학습목표, 학습대상, 커리큘럼 포함)
- **Package**: 추천 패키지
- **PackageItem**: 패키지 내 콘텐츠 항목 (추천 순서, 이유, 점수)
- **Conversation**: AI 대화 세션
- **ContentEmbedding**: 콘텐츠 벡터 임베딩

---

## API 엔드포인트

### 콘텐츠 API
- `GET /api/contents` - 콘텐츠 목록 (페이지네이션, 필터링)
- `GET /api/contents/[id]` - 콘텐츠 상세
- `GET /api/contents/filters` - 필터 옵션 목록
- `GET /api/contents/export` - Excel 내보내기

### 패키지 API
- `GET /api/packages` - 패키지 목록
- `POST /api/packages` - 패키지 생성
- `GET /api/packages/[id]` - 패키지 상세
- `PUT /api/packages/[id]` - 패키지 수정
- `DELETE /api/packages/[id]` - 패키지 삭제
- `GET /api/packages/stats` - 통계

### AI Chat API
- `POST /api/chat/start` - 새 대화 세션 시작
- `POST /api/chat/message` - 메시지 전송 및 VMSRP 추천 실행

---

## 참고 문서

- `docs/AI_RECOMMENDATION_SYSTEM_V2.md` - VMSRP 상세 설계 문서
- `docs/DEVELOPMENT_PLAN.md` - 개발 계획
- `docs/AI_CONTENT_RECOMMENDATION_PLAN.md` - 초기 추천 시스템 설계
- `docs/AI_RECOMMENDATION_UPGRADE_PLAN.md` - 업그레이드 계획

---

## 라이선스

MIT License

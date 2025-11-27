# Touch Contents CRM

AI 기반 교육 콘텐츠 추천 및 관리 시스템

## 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 기반 CSS 프레임워크
- **shadcn/ui** - 재사용 가능한 UI 컴포넌트
- **Lucide React** - 아이콘 라이브러리

### Backend
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Prisma ORM** - 타입 안전 데이터베이스 ORM
- **PostgreSQL** - 관계형 데이터베이스

### AI / ML
- **OpenAI API** - GPT-4o-mini (대화), text-embedding-3-small (임베딩)
- **JSON-based Vector Storage** - 콘텐츠 임베딩 저장 및 코사인 유사도 계산
- **복합 스코어링 시스템** - 유사도(50%) + 최신성(30%) + 예산적합성(20%)

## 주요 기능

### 1. 콘텐츠 관리 (/)
- 전체 콘텐츠 목록 조회 (테이블/카드 뷰)
- 다중 필터 및 검색 기능
- Excel 내보내기
- 콘텐츠 상세 정보 조회

### 2. AI 콘텐츠 추천 (/packages)
- AI 챗봇 기반 요구사항 수집
- 9가지 필수 정보 자동 수집:
  - 기업명, 산업분야, 교육인원
  - 교육대상, 직급/레벨, 스킬레벨
  - 학습목표, 교육기간, 예산
- **과정상세 기반 정밀 매칭**:
  - 과정소개, 학습목표, 학습대상, 커리큘럼 필드 활용
  - 스마트 검색 쿼리 생성
  - 복합 스코어링 (유사도 + 최신성 + 예산적합성)
- **20-25개 콘텐츠 추천** (기존 5-8개에서 확대)
- 최신 콘텐츠 우선 추천
- 자동 패키지 생성

### 3. 패키지 관리 (/packages/list)
- 생성된 패키지 목록 조회
- 상태별 필터링 (활성/보관)
- 패키지 상세 정보 및 추천 콘텐츠 확인
- 패키지 보관/삭제 기능

## 환경 설정

### 필수 요구사항
- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key

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

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── start/route.ts      # 챗 세션 시작
│   │   │   └── message/route.ts    # 메시지 처리 및 추천 생성
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
│   ├── openai.ts                   # OpenAI 서비스
│   ├── embedding-utils.ts          # 임베딩 생성 유틸리티
│   ├── search-utils.ts             # 스마트 검색 쿼리 유틸리티
│   └── prompts/
│       └── system.ts               # AI 시스템 프롬프트
├── scripts/
│   └── regenerate-embeddings.ts    # 임베딩 재생성 스크립트
└── prisma/
    └── schema.prisma               # 데이터베이스 스키마
```

## 데이터베이스 스키마

### 주요 모델

- **Content**: 교육 콘텐츠 정보 (과정소개, 학습목표, 학습대상, 커리큘럼 포함)
- **Package**: 추천 패키지
- **PackageItem**: 패키지 내 콘텐츠 항목
- **Conversation**: AI 대화 세션
- **ContentEmbedding**: 콘텐츠 벡터 임베딩

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
- `POST /api/chat/message` - 메시지 전송 및 응답

## AI 추천 시스템 아키텍처

### 스코어링 시스템
```
종합점수 = 유사도(50%) + 최신성(30%) + 예산적합성(20%)
```

- **유사도**: OpenAI 임베딩 기반 코사인 유사도
- **최신성**: 개발연도 기반 (2024년=100%, 2023년=90%, ...)
- **예산적합성**: 예산 대비 교육비 비율

### 스마트 검색 쿼리
사용자 요구사항을 구조화된 검색 쿼리로 변환:
- 학습목표 → 콘텐츠 learningObjective 매칭
- 직군/레벨/스킬 → 콘텐츠 targetAudience 매칭
- 산업분야 → 콘텐츠 카테고리 매칭

## 라이선스

MIT License

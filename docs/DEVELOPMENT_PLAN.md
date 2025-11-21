# Touch Contents CRM 개발 계획서

## 프로젝트 개요

Excel 기반 콘텐츠 관리 파일(contentsList.xlsx)을 웹 기반 CRM 시스템으로 전환하는 프로젝트

### 기술 스택
- **Frontend**: Next.js 14 (App Router), Shadcn/ui, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma

### 데이터 현황
- **총 레코드 수**: 3,317건
- **컬럼 수**: 32개

---

## Phase 1: 프로젝트 초기 설정 (Day 1)

### 1.1 Next.js 프로젝트 생성
- [x] Next.js 14 프로젝트 생성 (App Router)
- [x] TypeScript 설정
- [x] ESLint/Prettier 설정

### 1.2 Shadcn/ui 설치 및 설정
- [x] Shadcn/ui 초기화
- [x] 필요 컴포넌트 설치
  - [x] Button, Input, Select
  - [x] Table, DataTable
  - [x] Dialog, Sheet
  - [x] Card, Badge
  - [x] Dropdown Menu
  - [x] Command (검색용)
  - [x] Popover (필터용)
  - [x] Checkbox
  - [x] Label
  - [x] Tabs
  - [x] Slider

### 1.3 PostgreSQL 설정
- [x] PostgreSQL 데이터베이스 생성
- [x] 환경 변수 설정 (.env)
- [x] Prisma 설치 및 초기화

---

## Phase 2: 데이터베이스 스키마 설계 (Day 1-2)

### 2.1 스키마 설계

```prisma
model Content {
  id                    Int       @id @default(autoincrement())

  // 분류 체계
  majorCategory         String    @map("major_category")         // 대분류
  middleCategory        String    @map("middle_category")        // 중분류
  minorCategory         String    @map("minor_category")         // 소분류
  level0               String?   @map("level_0")                 // 0차
  level1               String?   @map("level_1")                 // 1차
  level2               String?   @map("level_2")                 // 2차
  level3               String?   @map("level_3")                 // 3차

  // 상세 정보
  detailContent         String?   @map("detail_content")         // 세부내용
  certificationStatus   String?   @map("certification_status")   // 자격증 여부
  note                  String?                                  // 비고
  category              String                                   // 구분
  categoryCode          String    @map("category_code")          // Unnamed: 11 (코드값)

  // 과정 정보
  courseName            String    @map("course_name")            // 과정명
  categoryRef           String    @map("category_ref")           // 구분/
  status                String?                                  // 상태
  sessions              Int                                      // 차시

  // 콘텐츠 상세
  courseIntro           String?   @map("course_intro")           // 과정소개
  curriculum            String?                                  // 학습내용(목차)
  developmentYear       String?   @map("development_year")       // 개발연도
  sme                   String?                                  // SME

  // 가격 정보
  educationFee          Int       @map("education_fee")          // 교육비(도서비제외)
  totalFee              Float?    @map("total_fee")              // 총 교육비(도서비포함)
  sampleLink            String?   @map("sample_link")            // 맛보기

  // ID 정보
  courseId              String?   @map("course_id")              // 코스 ID
  contentId             String?   @map("content_id")             // 콘텐츠 ID

  // 기타 정보
  dsblPrice             Float?    @map("dsbl_price")             // DSBL보존가(도서제외)
  turnkeyAvailable      String?   @map("turnkey_available")      // 턴키가능여부(건발건협의)
  targetAudience        String?   @map("target_audience")        // 학습대상
  learningObjective     String?   @map("learning_objective")     // 학습목표
  educationPeriod       String?   @map("education_period")       // 교육기간
  bookFee               String?   @map("book_fee")               // 도서비
  bookRequired          String?   @map("book_required")          // 도서필수

  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@map("contents")
}
```

### 2.2 인덱스 설정
- [x] 주요 필터링 컬럼에 인덱스 추가
  - majorCategory, middleCategory, minorCategory
  - status, category
  - developmentYear
  - courseName (Full-text search)

---

## Phase 3: 데이터 마이그레이션 (Day 2)

### 3.1 마이그레이션 스크립트 개발
- [x] Excel 파일 파싱 (xlsx 라이브러리)
- [x] 데이터 정제 및 변환
  - 컬럼명 매핑
  - 데이터 타입 변환
  - NULL 값 처리
- [x] Prisma seed 스크립트 작성

### 3.2 데이터 검증
- [x] 데이터 무결성 검증
- [x] 레코드 수 확인 (3,317건)
- [x] 주요 필드 샘플링 검증

---

## Phase 4: API 개발 (Day 2-3)

### 4.1 콘텐츠 API 엔드포인트

```typescript
// GET /api/contents
// - 페이지네이션
// - 다중 필터링
// - 정렬
// - 검색

// GET /api/contents/[id]
// - 단일 콘텐츠 조회

// GET /api/contents/filters
// - 필터 옵션 목록 조회 (각 컬럼의 고유값)

// POST /api/contents
// - 콘텐츠 생성

// PUT /api/contents/[id]
// - 콘텐츠 수정

// DELETE /api/contents/[id]
// - 콘텐츠 삭제

// GET /api/contents/export
// - Excel 내보내기
```

### 4.2 필터링 로직
- [x] 다중 필터 조합 지원
  - 대분류, 중분류, 소분류 (계층적 필터)
  - 상태, 구분, 개발연도
  - 교육비 범위
  - 차시 범위
- [x] 텍스트 검색 (과정명, 과정소개)
- [x] 정렬 기능 (다중 컬럼)

---

## Phase 5: Frontend 개발 (Day 3-5)

### 5.1 레이아웃 구조

```
app/
├── layout.tsx          # 루트 레이아웃
├── page.tsx            # 메인 페이지 (콘텐츠 목록)
├── contents/
│   └── [id]/
│       └── page.tsx    # 콘텐츠 상세
└── globals.css
```

### 5.2 주요 컴포넌트

#### 5.2.1 데이터 테이블 (DataTable)
- [x] TanStack Table 연동
- [x] 컬럼 정의
  - 기본 표시 컬럼: 구분, 대분류, 중분류, 과정명, 상태, 차시, 교육비, 개발연도
  - 컬럼 표시/숨김 토글
- [x] 페이지네이션
- [x] 행 선택 기능
- [x] 컬럼 정렬

#### 5.2.2 필터 패널 (FilterPanel)
- [x] 카테고리 필터 (계층적)
  - 대분류 → 중분류 → 소분류 (연계 필터)
  - 0차 → 1차 → 2차 → 3차
- [x] 상태 필터 (다중 선택)
- [x] 구분 필터 (다중 선택)
- [x] 개발연도 필터
- [x] 교육비 범위 필터
- [x] 차시 범위 필터
- [ ] 턴키가능여부 필터
- [x] 필터 초기화 버튼
- [x] 활성 필터 표시

#### 5.2.3 검색 바 (SearchBar)
- [x] 전체 텍스트 검색
- [x] 검색 대상 필드 선택
  - 과정명
  - 과정소개
  - SME
  - 학습목표

#### 5.2.4 콘텐츠 상세 모달/페이지
- [x] 전체 필드 표시
- [x] 탭 구성
  - 기본 정보
  - 과정 상세
  - 가격/판매 정보
  - 메타 정보

#### 5.2.5 CRUD 기능
- [ ] 콘텐츠 추가 폼
- [ ] 콘텐츠 수정 폼
- [x] 콘텐츠 삭제 확인

#### 5.2.6 데이터 내보내기
- [x] 현재 필터 기준 Excel 내보내기
- [ ] 선택 항목 Excel 내보내기

---

## Phase 6: 고급 기능 (Day 5-6)

### 6.1 UX 개선
- [ ] 무한 스크롤 또는 가상화 (대용량 데이터)
- [ ] 필터 프리셋 저장
- [ ] 컬럼 순서 드래그 앤 드롭
- [ ] 반응형 디자인 (모바일 지원)

### 6.2 성능 최적화
- [ ] API 응답 캐싱
- [ ] 필터 옵션 캐싱
- [ ] 이미지/리소스 최적화
- [ ] 서버 컴포넌트 활용

---

## Phase 7: 테스트 및 배포 (Day 6-7)

### 7.1 테스트
- [ ] API 엔드포인트 테스트
- [ ] 필터링 로직 테스트
- [ ] UI 컴포넌트 테스트
- [ ] E2E 테스트 (주요 플로우)

### 7.2 배포 준비
- [ ] 환경 변수 설정 가이드
- [ ] Docker 설정 (옵션)
- [ ] README 작성

---

## 데이터베이스 컬럼 상세

| 원본 컬럼명 | DB 컬럼명 | 타입 | 설명 | 고유값 수 | NULL 수 |
|------------|-----------|------|------|----------|---------|
| 대분류 | major_category | String | 9개 | 0 |
| 중분류 | middle_category | String | 78개 | 0 |
| 소분류 | minor_category | String | 251개 | 0 |
| 0차 | level_0 | String | 5개 | 0 |
| 1차 | level_1 | String | 45개 | 0 |
| 2차 | level_2 | String? | 134개 | 5 |
| 3차 | level_3 | String? | 95개 | 1,637 |
| 세부내용 | detail_content | String? | 15개 | 3,247 |
| 자격증 여부 | certification_status | String? | 1개 | 2,775 |
| 비고 | note | String? | 28개 | 2,925 |
| 구분 | category | String | 13개 | 0 |
| Unnamed: 11 | category_code | String | 코드 | 0 |
| 과정명 | course_name | String | | 0 |
| 구분/ | category_ref | String | | 0 |
| 상태 | status | String? | 21개 | 1 |
| 차시 | sessions | Int | 85개 | 0 |
| 과정소개 | course_intro | Text? | | 4 |
| 학습내용(목차) | curriculum | Text? | | 0 |
| 개발연도 | development_year | String? | 158개 | 0 |
| SME | sme | String? | 1,102개 | 0 |
| 교육비(도서비제외) | education_fee | Int | 123개 | 0 |
| 총 교육비(도서비포함) | total_fee | Float? | 215개 | 22 |
| 맛보기 | sample_link | String? | 2개 | 2 |
| 코스 ID | course_id | String? | 2,665개 | 645 |
| 콘텐츠 ID | content_id | String? | 2,666개 | 644 |
| DSBL보존가(도서제외) | dsbl_price | Float? | 165개 | 5 |
| 턴키가능여부(건발건협의) | turnkey_available | String? | 4개 | 0 |
| 학습대상 | target_audience | Text? | | 29 |
| 학습목표 | learning_objective | Text? | | 31 |
| 교육기간 | education_period | String? | 5개 | 0 |
| 도서비 | book_fee | String? | 93개 | 51 |
| 도서필수 | book_required | String? | 2개 | 3,187 |

---

## 필터링 기능 상세

### 주요 필터 항목

1. **카테고리 필터** (계층적)
   - 대분류 (9개): 어학, 자격증, 전문직무 등
   - 중분류 (78개): 대분류에 따라 동적 변경
   - 소분류 (251개): 중분류에 따라 동적 변경

2. **분류 체계 필터** (계층적)
   - 0차 (5개): 공통직무 등
   - 1차 (45개)
   - 2차 (134개)
   - 3차 (95개)

3. **상태 필터**
   - 완료, 진행중 등 21개 상태

4. **구분 필터**
   - 13개 구분 값

5. **개발연도 필터**
   - 연도별 필터링

6. **수치 범위 필터**
   - 교육비 범위 (Min-Max 슬라이더)
   - 차시 범위 (Min-Max 슬라이더)

7. **기타 필터**
   - 턴키가능여부 (O, X 등 4개)
   - 도서필수 여부

---

## 예상 일정

| Phase | 작업 내용 | 예상 소요 |
|-------|----------|----------|
| Phase 1 | 프로젝트 초기 설정 | 0.5일 |
| Phase 2 | DB 스키마 설계 | 0.5일 |
| Phase 3 | 데이터 마이그레이션 | 0.5일 |
| Phase 4 | API 개발 | 1일 |
| Phase 5 | Frontend 개발 | 2일 |
| Phase 6 | 고급 기능 | 1일 |
| Phase 7 | 테스트 및 배포 | 0.5일 |
| **총계** | | **6일** |

---

## 파일 구조 (예상)

```
touch-contents-crm/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── api/
│   │   └── contents/
│   │       ├── route.ts
│   │       ├── [id]/
│   │       │   └── route.ts
│   │       ├── filters/
│   │       │   └── route.ts
│   │       └── export/
│   │           └── route.ts
│   └── contents/
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/                    # Shadcn components
│   ├── data-table/
│   │   ├── data-table.tsx
│   │   ├── columns.tsx
│   │   └── toolbar.tsx
│   ├── filters/
│   │   ├── filter-panel.tsx
│   │   ├── category-filter.tsx
│   │   ├── range-filter.tsx
│   │   └── multi-select-filter.tsx
│   ├── content-detail.tsx
│   └── search-bar.tsx
├── lib/
│   ├── prisma.ts
│   ├── utils.ts
│   └── types.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/
│   └── migrate-data.ts
├── res/
│   └── contentsList.xlsx
├── docs/
│   └── DEVELOPMENT_PLAN.md
├── .env
├── package.json
└── README.md
```

---

## 참고 사항

1. **인증/인가 제외**: 요구사항에 따라 로그인/회원가입 기능 미포함
2. **데이터 백업**: 마이그레이션 전 원본 Excel 파일 백업 권장
3. **확장 고려**: 향후 인증 기능 추가 시 NextAuth.js 도입 권장

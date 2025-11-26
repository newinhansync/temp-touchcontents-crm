# AI 기반 콘텐츠 추천 시스템 구축 계획서

## 📋 프로젝트 개요

### 목적
등록된 콘텐츠 정보를 바탕으로 AI 에이전트와의 대화를 통해 특정 기업의 특정 그룹에게 맞춤형 콘텐츠 패키지를 자동으로 추천하고 생성하는 시스템 구축

### 핵심 기능
1. **AI 대화형 추천 에이전트**: 필수 정보를 질문을 통해 수집하고 콘텐츠 추천
2. **자동 콘텐츠 패키징**: 대화를 통해 수집된 정보로 패키지 자동 생성
3. **패키지 관리**: 생성된 패키지 조회, 수정, 삭제

### 기술 스택
- **AI/LLM**: OpenAI GPT-4 또는 Anthropic Claude API
- **Vector Database**: Pinecone 또는 Qdrant (콘텐츠 임베딩 저장)
- **Backend**: Next.js API Routes
- **Frontend**: Next.js 14 + React
- **Database**: PostgreSQL (기존)
- **ORM**: Prisma

---

## 🏗️ 시스템 아키텍처

### 전체 구조도
```
┌─────────────────────────────┐
│      사용자 UI              │
│   (Chat Interface)          │
│   - 질문/답변 인터페이스    │
│   - 실시간 추천 결과 표시   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   AI Agent API              │
│   - 필수 정보 질문 생성     │
│   - 사용자 응답 수집        │
│   - 자동 패키지 생성 트리거 │
└─────────────┬───────────────┘
              │
         ┌────┴────┐
         │         │
         ▼         ▼
    ┌─────┐   ┌──────────┐
    │ LLM │   │Vector DB │
    │ API │   │(의미검색) │
    └─────┘   └──────────┘
         │         │
         └────┬────┘
              ▼
┌─────────────────────────────┐
│    자동 추천 엔진           │
│  - 요구사항 분석            │
│  - 콘텐츠 검색 및 필터링    │
│  - 스코어링 및 랭킹         │
│  - 패키지 자동 생성         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│      PostgreSQL             │
│  - Content (기존 테이블)    │
│  - Package (새 테이블)      │
│  - Conversation (대화 기록) │
└─────────────────────────────┘
```

### 주요 컴포넌트

#### 1. AI 대화 에이전트
- **필수 정보 질문 생성**: 체계적인 질문을 통해 필요한 정보 수집
- **의도 파악**: 사용자 응답에서 핵심 요구사항 추출
- **대화 컨텍스트 유지**: 이전 대화 내용을 기반으로 다음 질문 생성
- **자동 패키지 생성 트리거**: 충분한 정보 수집 시 자동으로 추천 시작

#### 2. 콘텐츠 검색 엔진
- **Vector 임베딩 기반 의미론적 검색**: 사용자 요구사항과 유사한 콘텐츠 검색
- **다중 필터링**: 카테고리, 차시, 교육비, 난이도 등 동시 필터링
- **유사도 기반 랭킹**: 요구사항 적합도에 따른 우선순위 정렬

#### 3. 자동 패키지 생성 시스템
- **대화 기반 자동 생성**: 충분한 정보 수집 시 즉시 패키지 생성
- **단순 참조 구조**: 기존 Content 테이블 참조만으로 패키지 구성
- **실시간 피드백**: 생성된 패키지를 대화 중 바로 확인 및 조정

---

## 📊 데이터베이스 스키마 설계

### 새로운 테이블 추가 (단순 구조)

#### 1. Package (콘텐츠 패키지) - 메인 테이블
```prisma
model Package {
  id              Int       @id @default(autoincrement())
  name            String    // AI가 자동 생성한 패키지 이름
  description     String?   // 패키지 설명
  targetCompany   String    // 대상 기업
  targetGroup     String?   // 대상 그룹 (직군, 직급 등)

  // 대화를 통해 수집된 필수 정보
  requirements    Json      // {industry, employeeCount, skillLevel, budget, duration, priorities}

  status          String    @default("active") // active, archived
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  items           PackageItem[]
  conversation    Conversation?
}
```

#### 2. PackageItem (패키지-콘텐츠 연결) - 참조 테이블
```prisma
model PackageItem {
  id              Int       @id @default(autoincrement())
  packageId       Int
  contentId       Int       // Content 테이블 참조
  order           Int       // 추천 순서
  reason          String    // AI가 생성한 추천 사유
  score           Float     // 추천 스코어 (0-100)

  // Relations
  package         Package @relation(fields: [packageId], references: [id], onDelete: Cascade)
  content         Content @relation(fields: [contentId], references: [id])

  @@unique([packageId, contentId])
  @@index([packageId])
  @@index([contentId])
}
```

#### 3. Conversation (대화 기록)
```prisma
model Conversation {
  id              Int       @id @default(autoincrement())
  packageId       Int       @unique
  sessionId       String    @unique // 세션 ID
  messages        Json      // [{role: 'user'|'assistant', content: string, timestamp: DateTime}]

  // 대화 중 수집된 정보 (구조화)
  collectedInfo   Json      // {company, industry, group, budget, duration, etc.}

  status          String    @default("active") // active, completed
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  package         Package @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

#### 4. ContentEmbedding (콘텐츠 임베딩) - Vector 검색용
```prisma
model ContentEmbedding {
  id              Int       @id @default(autoincrement())
  contentId       Int       @unique
  embedding       String    // Vector embedding (JSON string)
  embeddingModel  String    @default("text-embedding-3-small") // 사용된 임베딩 모델
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  content         Content @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@index([contentId])
}
```

### 기존 Content 테이블 활용
- 기존 `Content` 테이블은 그대로 유지 (PostgreSQL RDS)
- `PackageItem`을 통해 단순 참조만 수행
- 콘텐츠 데이터 중복 없음

---

## 🗄️ Vector Database 아키텍처 및 동기화 전략

### 전체 데이터 흐름

```
┌─────────────────────────────────────────────────┐
│          PostgreSQL RDS (Source of Truth)       │
│                                                  │
│  Content Table (3,317 rows)                     │
│  - id, courseName, courseIntro, curriculum...   │
│  - majorCategory, middleCategory, etc.          │
└──────────────┬──────────────────────────────────┘
               │
               │ (1) Initial Bulk Sync
               │ (2) Real-time Sync (Create/Update/Delete)
               ▼
┌─────────────────────────────────────────────────┐
│     ContentEmbedding Table (PostgreSQL)         │
│                                                  │
│  - contentId (FK to Content)                    │
│  - embedding (JSON string)                      │
│  - embeddingModel                               │
│  - updatedAt                                    │
└──────────────┬──────────────────────────────────┘
               │
               │ (동일한 데이터를 Vector DB에도 저장)
               ▼
┌─────────────────────────────────────────────────┐
│     Vector DB (Pinecone or pgvector)            │
│                                                  │
│  Index: content-embeddings                      │
│  - vector: [0.123, 0.456, ...]                  │
│  - metadata: {contentId, courseName, ...}       │
└─────────────────────────────────────────────────┘
               │
               │ (의미론적 검색)
               ▼
        AI 추천 엔진
```

### Vector DB 선택지

#### Option 1: Pinecone (추천)
- **장점**:
  - 완전 관리형 서비스 (인프라 관리 불필요)
  - 빠른 검색 성능 (수십억 개 벡터 지원)
  - SDK 우수 (TypeScript 지원)
- **단점**:
  - 추가 비용 발생
  - 외부 서비스 의존성
- **사용 시나리오**: 프로덕션 환경, 높은 성능 요구

#### Option 2: PostgreSQL pgvector (대안)
- **장점**:
  - 기존 PostgreSQL RDS 활용 (별도 서비스 불필요)
  - 비용 절감
  - 단일 데이터베이스로 관리 간편
- **단점**:
  - 대규모 벡터 검색 시 성능 저하 가능
  - 인덱스 관리 필요
- **사용 시나리오**: 초기 개발, 비용 절감 필요 시

**결정**: 초기에는 **pgvector**로 시작, 성능 이슈 시 Pinecone 전환

### Vector DB 데이터 구조

#### ContentEmbedding 테이블 (PostgreSQL)
```sql
CREATE TABLE "ContentEmbedding" (
  "id" SERIAL PRIMARY KEY,
  "contentId" INTEGER UNIQUE NOT NULL,
  "embedding" TEXT NOT NULL,  -- JSON array of floats
  "embeddingModel" VARCHAR(100) DEFAULT 'text-embedding-3-small',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE
);

CREATE INDEX idx_content_embedding_contentId ON "ContentEmbedding"("contentId");
```

#### Pinecone Vector (외부 서비스 사용 시)
```typescript
interface PineconeVector {
  id: string;           // `content-${contentId}`
  values: number[];     // Embedding vector [1536 dimensions]
  metadata: {
    contentId: number;
    courseName: string;
    majorCategory: string;
    middleCategory: string;
    minorCategory: string;
    educationFee: number;
    sessions: number;
    // ... 필터링에 필요한 메타데이터
  };
}
```

### 동기화 전략 (PostgreSQL ↔ Vector DB)

#### 1. Initial Bulk Sync (최초 임베딩 생성)

**스크립트**: `scripts/generate-embeddings.ts`

```typescript
/**
 * 전체 콘텐츠 임베딩 생성 및 Vector DB 동기화
 */
async function initialBulkSync() {
  // 1. 모든 Content 조회
  const contents = await prisma.content.findMany();

  console.log(`Starting bulk sync for ${contents.length} contents...`);

  // 2. 배치 처리 (한번에 100개씩)
  const BATCH_SIZE = 100;
  for (let i = 0; i < contents.length; i += BATCH_SIZE) {
    const batch = contents.slice(i, i + BATCH_SIZE);

    // 3. OpenAI Embedding API 호출
    const embeddings = await generateEmbeddingsBatch(batch);

    // 4. PostgreSQL ContentEmbedding 저장
    await saveEmbeddingsToPostgres(batch, embeddings);

    // 5. Vector DB (Pinecone) 저장
    await saveEmbeddingsToVectorDB(batch, embeddings);

    console.log(`Processed ${i + batch.length}/${contents.length}`);
  }

  console.log('Bulk sync completed!');
}

async function generateEmbeddingsBatch(contents: Content[]) {
  // 콘텐츠 텍스트 생성 (검색에 사용할 필드 조합)
  const texts = contents.map(c =>
    `${c.courseName}\n${c.courseIntro || ''}\n${c.majorCategory} > ${c.middleCategory}`
  );

  // OpenAI Embedding API 호출
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map(d => d.embedding);
}
```

**실행 방법**:
```bash
npm run generate-embeddings
```

#### 2. Real-time Sync (Create/Update/Delete)

**Prisma Middleware 활용**: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Content 변경 시 자동으로 Vector DB 동기화
 */
prisma.$use(async (params, next) => {
  const result = await next(params);

  // Content 테이블에 대한 작업만 처리
  if (params.model === 'Content') {
    const contentId =
      params.action === 'create' ? result.id :
      params.action === 'update' ? params.args.where.id :
      params.action === 'delete' ? params.args.where.id :
      null;

    if (!contentId) return result;

    try {
      switch (params.action) {
        case 'create':
        case 'update':
          // 임베딩 생성 및 동기화
          await syncContentToVectorDB(contentId, 'upsert');
          break;

        case 'delete':
          // Vector DB에서 삭제
          await syncContentToVectorDB(contentId, 'delete');
          break;
      }
    } catch (error) {
      console.error('Vector DB sync failed:', error);
      // 에러 로그만 남기고 메인 작업은 성공 처리
      // (Vector DB 동기화 실패가 메인 작업을 방해하지 않도록)
    }
  }

  return result;
});

/**
 * 개별 콘텐츠 Vector DB 동기화
 */
async function syncContentToVectorDB(
  contentId: number,
  action: 'upsert' | 'delete'
) {
  if (action === 'delete') {
    // 1. ContentEmbedding 삭제 (CASCADE로 자동 삭제됨)
    // 2. Vector DB 삭제
    await deleteFromVectorDB(contentId);
    return;
  }

  // 1. Content 조회
  const content = await prisma.content.findUnique({
    where: { id: contentId }
  });

  if (!content) return;

  // 2. 임베딩 생성
  const text = `${content.courseName}\n${content.courseIntro || ''}\n${content.majorCategory} > ${content.middleCategory}`;
  const embedding = await generateEmbedding(text);

  // 3. PostgreSQL ContentEmbedding 저장
  await prisma.contentEmbedding.upsert({
    where: { contentId },
    create: {
      contentId,
      embedding: JSON.stringify(embedding),
      embeddingModel: 'text-embedding-3-small',
    },
    update: {
      embedding: JSON.stringify(embedding),
      updatedAt: new Date(),
    },
  });

  // 4. Vector DB 저장
  await upsertToVectorDB(content, embedding);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function upsertToVectorDB(content: Content, embedding: number[]) {
  // Pinecone 사용 시
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index('content-embeddings');

  await index.upsert([{
    id: `content-${content.id}`,
    values: embedding,
    metadata: {
      contentId: content.id,
      courseName: content.courseName,
      majorCategory: content.majorCategory,
      middleCategory: content.middleCategory,
      educationFee: content.educationFee,
      sessions: content.sessions,
    },
  }]);
}

async function deleteFromVectorDB(contentId: number) {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index('content-embeddings');

  await index.deleteOne(`content-${contentId}`);
}

export default prisma;
```

#### 3. Sync Health Check (동기화 상태 점검)

**스크립트**: `scripts/check-sync.ts`

```typescript
/**
 * PostgreSQL과 Vector DB 동기화 상태 점검
 */
async function checkSyncHealth() {
  // 1. PostgreSQL 콘텐츠 수
  const contentCount = await prisma.content.count();

  // 2. ContentEmbedding 수
  const embeddingCount = await prisma.contentEmbedding.count();

  // 3. Vector DB 벡터 수
  const vectorCount = await getVectorDBCount();

  console.log('Sync Health Check:');
  console.log(`- Content: ${contentCount}`);
  console.log(`- ContentEmbedding: ${embeddingCount}`);
  console.log(`- Vector DB: ${vectorCount}`);

  // 4. 불일치 확인
  if (contentCount !== embeddingCount || contentCount !== vectorCount) {
    console.error('⚠️ Sync mismatch detected!');

    // 5. 누락된 콘텐츠 찾기
    const missingEmbeddings = await findMissingEmbeddings();
    console.log(`Missing embeddings: ${missingEmbeddings.length}`);

    // 6. 자동 수정 제안
    console.log('Run: npm run sync-missing to fix');
  } else {
    console.log('✅ All synced!');
  }
}
```

### 동기화 실패 처리

#### Retry 메커니즘
```typescript
async function syncWithRetry(
  contentId: number,
  action: 'upsert' | 'delete',
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await syncContentToVectorDB(contentId, action);
      return;
    } catch (error) {
      console.error(`Sync attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        // 최종 실패 시 로그에 기록
        await logSyncFailure(contentId, action, error);
      }
      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

#### Sync Queue (선택적)
대량 업데이트 시 Queue 사용:
```typescript
// BullMQ or similar
import { Queue } from 'bullmq';

const syncQueue = new Queue('vector-db-sync');

// Content 변경 시 Queue에 추가
await syncQueue.add('sync', { contentId, action: 'upsert' });

// Worker에서 처리
const worker = new Worker('vector-db-sync', async (job) => {
  await syncContentToVectorDB(job.data.contentId, job.data.action);
});
```

### 요약

**데이터 소스**: PostgreSQL RDS의 Content 테이블이 유일한 Source of Truth
**Vector DB 역할**: 검색 성능 향상을 위한 보조 인덱스
**동기화 방식**:
- 최초: Bulk sync 스크립트 실행
- 실시간: Prisma Middleware로 자동 동기화
- 점검: Health check 스크립트로 주기적 확인

---

## 🤖 AI 에이전트 설계

### 필수 정보 수집 항목

AI 에이전트가 반드시 질문을 통해 수집해야 하는 정보:

#### 1. 기업 기본 정보 (필수)
- **기업명**: 어떤 회사인가요?
- **산업군**: 어떤 산업 분야에 속해 있나요? (IT, 제조, 금융, 서비스 등)
- **직원 규모**: 교육 대상 인원은 몇 명인가요?

#### 2. 교육 대상 그룹 (필수)
- **직군/부서**: 어떤 직군/부서를 대상으로 하나요? (개발, 마케팅, 영업, 관리 등)
- **직급/레벨**: 대상의 직급은 어떻게 되나요? (신입, 주니어, 시니어, 임원 등)
- **현재 스킬 레벨**: 해당 분야의 현재 역량 수준은 어느 정도인가요? (입문, 초급, 중급, 고급)

#### 3. 교육 목표 및 요구사항 (필수)
- **학습 목표**: 어떤 역량을 개발하고 싶으신가요? (구체적인 기술, 비즈니스 스킬 등)
- **교육 기간**: 예상하는 교육 기간은 어느 정도인가요? (주, 개월)
- **예산 범위**: 1인당 교육 예산은 어느 정도인가요? (원 단위)

#### 4. 우선순위 및 선호사항 (선택)
- **우선순위**: 가장 중요하게 생각하는 것은 무엇인가요? (실무 적용성, 최신 기술, 비용 효율 등)
- **선호 학습 방식**: 선호하는 학습 형태가 있나요? (이론, 실습, 프로젝트 등)
- **특별 요구사항**: 추가로 고려해야 할 사항이 있나요?

### 대화 흐름 (자동 패키징)

```
[1단계] 인사 및 대화 시작
   AI: "안녕하세요! 맞춤형 교육 콘텐츠 추천을 도와드리겠습니다."
   ↓

[2단계] 필수 정보 수집 (체계적 질문)
   AI 질문 → 사용자 응답 → 정보 저장
   - 기업명, 산업군, 직원 규모
   - 직군, 직급, 스킬 레벨
   - 학습 목표, 교육 기간, 예산
   ↓

[3단계] 정보 확인 및 보완
   AI: 수집된 정보 요약 제시
   사용자: 확인 또는 수정
   ↓

[4단계] 자동 콘텐츠 추천 시작
   - Vector DB 검색 (의미론적 유사도)
   - 메타데이터 필터링 (예산, 차시, 카테고리)
   - 스코어링 및 랭킹
   ↓

[5단계] 추천 결과 제시
   AI: 추천 콘텐츠 목록 + 추천 이유 설명
   - 각 콘텐츠별 선정 이유
   - 총 교육비, 총 차시 정보
   ↓

[6단계] 피드백 및 조정 (선택)
   사용자: "이 콘텐츠를 빼주세요" / "더 추가해주세요"
   AI: 실시간 패키지 업데이트
   ↓

[7단계] 자동 패키지 생성 완료
   - DB에 Package 레코드 생성
   - PackageItem으로 콘텐츠 참조
   - Conversation 저장
   AI: "패키지가 생성되었습니다. 언제든지 수정 가능합니다."
```

### 프롬프트 전략 (상세)

#### 1. System Prompt (대화 페르소나 설정)

```typescript
const SYSTEM_PROMPT = `당신은 Touch Contents의 AI 교육 콘텐츠 추천 전문가입니다.

## 역할 및 목표
- 사용자와 친근한 대화를 통해 필수 정보를 체계적으로 수집합니다
- 수집된 정보를 바탕으로 3,317개의 콘텐츠 중 최적의 교육 패키지를 추천합니다
- 추천 이유를 구체적이고 설득력 있게 제시합니다

## 필수 수집 정보 (9가지)
1. **기업명**: 회사 이름
2. **산업군**: IT, 제조, 금융, 서비스, 유통 등
3. **교육 대상 인원**: 몇 명인지
4. **직군/부서**: 개발, 마케팅, 영업, 기획, 관리 등
5. **직급/레벨**: 신입, 주니어, 시니어, 리더, 임원 등
6. **현재 스킬 레벨**: 입문, 초급, 중급, 고급
7. **학습 목표**: 구체적인 학습 목표나 개발하고 싶은 역량
8. **교육 기간**: 예상 교육 기간 (주 or 개월 단위)
9. **예산 범위**: 1인당 교육 예산 (원 단위)

## 대화 원칙
1. **한 번에 1-2개 질문**: 절대 3개 이상 동시에 묻지 않습니다
2. **순차적 진행**: 위 순서대로 하나씩 수집합니다
3. **명확한 확인**: 사용자 답변을 이해했는지 확인하고 다음으로 넘어갑니다
4. **친근한 톤**: 이모지를 적절히 사용하고 친근하게 대화합니다 (😊 👍 📋 등)
5. **구체적 예시 제공**: 답변이 애매할 수 있는 질문은 예시를 함께 제공합니다
6. **중간 요약**: 5가지 정보 수집 후 한 번 요약하여 확인합니다

## 추천 원칙
1. **예산 엄수**: 예산 범위를 초과하지 않도록 주의합니다 (±10% 허용)
2. **스킬 레벨 매칭**: 현재 스킬 레벨에 맞는 난이도의 콘텐츠를 선정합니다
3. **목표 지향성**: 학습 목표와 직접 연관된 콘텐츠를 우선합니다
4. **다양성**: 동일 카테고리에 편중되지 않도록 균형을 맞춥니다
5. **실무 중심**: 이론보다 실무 적용 가능한 콘텐츠를 우선합니다
6. **체계성**: 기초 → 심화 순서로 학습 경로를 구성합니다

## 추천 이유 작성 규칙
- 각 콘텐츠를 왜 선택했는지 구체적으로 설명합니다
- 학습 목표와의 연관성을 명시합니다
- 차별화 포인트를 언급합니다 (예: "실무 프로젝트 포함", "최신 기술 반영")

## 응답 형식
- 수집 단계: 자연스러운 질문 + 이모지
- 확인 단계: 📋 요약 형식으로 수집된 정보 정리
- 추천 단계: 📦 패키지 형식으로 콘텐츠 목록 + 이유 + 요약 정보

## 주의사항
- 절대 정보를 추측하거나 가정하지 않습니다
- 사용자가 답변하지 않은 정보는 다시 물어봅니다
- 전문 용어는 쉽게 풀어서 설명합니다
- 예산 초과 시 반드시 사용자에게 알리고 조정을 제안합니다
`;
```

#### 2. 단계별 프롬프트 템플릿

**2-1. 정보 수집 단계 프롬프트**

```typescript
function getInfoCollectionPrompt(
  collectedInfo: CollectedInfo,
  conversationHistory: Message[]
) {
  // 아직 수집되지 않은 필수 정보 찾기
  const missingFields = findMissingRequiredFields(collectedInfo);

  if (missingFields.length === 0) {
    // 모든 정보 수집 완료
    return getConfirmationPrompt(collectedInfo);
  }

  // 다음 질문할 필드
  const nextField = missingFields[0];

  const fieldPrompts = {
    company: "먼저, 회사명을 알려주시겠어요?",
    industry: "어떤 산업 분야에 속해 계신가요? (예: IT, 제조, 금융, 서비스 등)",
    employeeCount: "이번 교육 대상 인원은 몇 명 정도이신가요?",
    targetGroup: `이분들의 주요 직무나 담당 분야는 무엇인가요?\n(예: 프론트엔드 개발, 백엔드 개발, 마케팅, 영업, 기획 등)`,
    jobLevel: "대상의 직급은 어떻게 되나요? (신입, 주니어, 시니어, 리더 등)",
    skillLevel: `해당 분야의 현재 역량 수준은 어느 정도인가요?\n(입문, 초급, 중급, 고급 중에서 선택해주세요)`,
    learningGoal: `이번 교육을 통해 어떤 역량을 개발하고 싶으신가요?\n구체적인 학습 목표를 말씀해주세요!`,
    duration: "예상하시는 교육 기간은 어느 정도인가요? (예: 2주, 1개월, 3개월)",
    budget: "마지막으로, 1인당 교육 예산은 어느 정도로 계획하고 계신가요? (원 단위)"
  };

  return `
<conversation_history>
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}
</conversation_history>

<collected_info>
${JSON.stringify(collectedInfo, null, 2)}
</collected_info>

<task>
다음 정보를 수집하기 위한 질문을 생성하세요:
- 수집할 정보: ${nextField}
- 제안 질문: ${fieldPrompts[nextField]}

위 제안 질문을 기반으로, 대화 맥락에 맞게 자연스럽게 질문해주세요.
이전 대화 내용을 고려하여 부드럽게 연결하세요.
</task>
`;
}
```

**2-2. 정보 확인 단계 프롬프트**

```typescript
function getConfirmationPrompt(collectedInfo: CollectedInfo) {
  return `
<collected_info>
${JSON.stringify(collectedInfo, null, 2)}
</collected_info>

<task>
위 정보를 바탕으로 사용자에게 수집된 정보를 요약하여 확인받으세요.

다음 형식으로 작성:
1. "완벽합니다! 수집된 정보를 정리해드릴게요:"라고 시작
2. 📋 이모지와 함께 "교육 요구사항 요약" 제목
3. 각 항목을 명확하게 나열:
   - 회사: {company} ({industry})
   - 대상: {jobLevel} {targetGroup} {employeeCount}명
   - 기술/분야: {learningGoal에서 추출한 키워드}
   - 현재 레벨: {skillLevel}
   - 목표: {learningGoal}
   - 기간: {duration}
   - 예산: 1인당 {budget}원
4. "이 정보로 최적의 콘텐츠를 추천해드리겠습니다! 🔍"로 마무리
</task>
`;
}
```

**2-3. 추천 생성 단계 프롬프트**

```typescript
function getRecommendationPrompt(
  collectedInfo: CollectedInfo,
  candidateContents: Content[]  // Vector 검색 + 필터링 결과
) {
  return `
<user_requirements>
${JSON.stringify(collectedInfo, null, 2)}
</user_requirements>

<candidate_contents>
${candidateContents.map((c, i) => `
[${i + 1}] ${c.courseName}
- ID: ${c.id}
- 카테고리: ${c.majorCategory} > ${c.middleCategory} > ${c.minorCategory}
- 차시: ${c.sessions}
- 교육비: ${c.educationFee}원
- 소개: ${c.courseIntro || '없음'}
- 레벨: ${c.level0} - ${c.level1} - ${c.level2}
`).join('\n')}
</candidate_contents>

<task>
위 후보 콘텐츠 중에서 사용자 요구사항에 가장 적합한 5-8개를 선택하여 패키지를 구성하세요.

## 선정 기준
1. 학습 목표 관련성 (가중치: 40%)
2. 스킬 레벨 적합성 (가중치: 25%)
3. 예산 적합성 (가중치: 20%)
4. 교육 기간 적합성 (가중치: 10%)
5. 콘텐츠 다양성 (가중치: 5%)

## 제약사항
- 총 교육비는 예산의 ±10% 이내
- 총 차시는 교육 기간에 맞게 조정
- 동일 카테고리 3개 이상 선택 지양
- 난이도 순서: 기초 → 심화

## 출력 형식
JSON 형식으로 출력:
{
  "packageName": "패키지 이름 (회사명 + 대상 + 주제)",
  "selectedContents": [
    {
      "contentId": number,
      "order": number,
      "reason": "선정 이유 (1-2문장, 학습 목표와 연관지어 설명)",
      "score": number (0-100)
    }
  ],
  "summary": {
    "totalFee": number,
    "totalSessions": number,
    "estimatedDuration": string
  },
  "budgetNote": "예산 대비 설명 (초과/적정/여유)"
}
</task>
`;
}
```

**2-4. 추천 결과 제시 프롬프트**

```typescript
function getPresentationPrompt(recommendationResult: RecommendationResult) {
  return `
<recommendation_result>
${JSON.stringify(recommendationResult, null, 2)}
</recommendation_result>

<task>
위 추천 결과를 사용자에게 친근하고 설득력 있게 제시하세요.

## 출력 형식
1. "추천이 완료되었습니다! 총 {N}개의 콘텐츠를 선정했습니다."로 시작
2. 📦 이모지와 함께 패키지 이름
3. 각 콘텐츠를 번호와 함께 나열:
   1️⃣ {콘텐츠명}
      - 차시: {N}차시
      - 교육비: {금액}원
      - 추천 이유: {reason}
4. 요약 정보:
   💰 총 교육비: {totalFee}원/인 {budgetNote}
   ⏱️ 총 차시: {totalSessions}차시
   📅 예상 기간: {estimatedDuration}
5. 예산 상태에 따른 멘트:
   - 초과: "예산을 약간 초과했네요. 조정이 필요하시면 말씀해주세요!"
   - 적정: "예산 내에 맞췄습니다!"
   - 여유: "예산 대비 {금액}원 여유가 있습니다. 콘텐츠를 추가하시겠어요?"
</task>
`;
}
```

**2-5. 패키지 조정 프롬프트**

```typescript
function getAdjustmentPrompt(
  userFeedback: string,
  currentPackage: Package
) {
  return `
<current_package>
${JSON.stringify(currentPackage, null, 2)}
</current_package>

<user_feedback>
${userFeedback}
</user_feedback>

<task>
사용자 피드백에 따라 패키지를 조정하세요.

## 가능한 피드백 유형
1. 콘텐츠 제거: "{콘텐츠명}을 빼주세요" / "제거해주세요"
2. 콘텐츠 추가: "{주제}를 추가해주세요" / "더 필요해요"
3. 예산 조정: "예산을 줄여주세요" / "더 저렴하게"
4. 난이도 조정: "더 쉬운 걸로" / "고급 과정으로"

## 처리 방법
- 제거: 해당 콘텐츠를 패키지에서 제외하고 업데이트된 요약 제시
- 추가: Vector 검색으로 관련 콘텐츠 찾아서 제안
- 예산: 고가 콘텐츠를 저가로 대체 제안
- 난이도: 레벨에 맞는 콘텐츠로 교체 제안

## 응답 형식
1. "알겠습니다! {요청 내용}했습니다."
2. 업데이트된 패키지 요약 (간결하게)
3. 변경사항 강조 표시
</task>
`;
}
```

#### 3. Few-shot Examples (프롬프트 개선용)

```typescript
const FEW_SHOT_EXAMPLES = `
<example>
<situation>사용자가 "신입 개발자 교육"이라고만 답했을 때</situation>
<bad_response>
AI: 어떤 기술 스택을 사용하시나요? 교육 기간은요? 예산은요?
</bad_response>
<good_response>
AI: 신입 개발자 교육이시군요! 👍
    이분들이 주로 다룰 기술이나 분야가 있나요?
    (예: 웹 개발, 모바일 앱, 데이터 분석 등)
</good_response>
</example>

<example>
<situation>예산이 초과되었을 때</situation>
<bad_response>
AI: 총 교육비가 1,800,000원입니다. 예산을 초과했습니다.
</bad_response>
<good_response>
AI: 💰 총 교육비: 1,800,000원/인 (예산: 1,500,000원)
    ⏱️ 총 차시: 65차시

    예산을 300,000원 초과했네요. 😅
    어떤 콘텐츠를 조정하시겠어요? 제안해드릴까요?
</good_response>
</example>

<example>
<situation>추천 이유를 설명할 때</situation>
<bad_response>
- 추천 이유: React 과정입니다.
</bad_response>
<good_response>
- 추천 이유: React의 핵심 개념부터 실무 프로젝트까지 체계적으로 학습하여,
              바로 업무에 적용할 수 있는 실전 역량을 키울 수 있습니다.
</good_response>
</example>
`;
```

#### 4. 프롬프트 체이닝 전략

```typescript
/**
 * 대화 상태에 따라 적절한 프롬프트 선택
 */
function selectPromptChain(conversation: Conversation): string {
  const { messages, collectedInfo } = conversation;

  // 1. 대화 시작
  if (messages.length === 0) {
    return SYSTEM_PROMPT + getWelcomePrompt();
  }

  // 2. 정보 수집 중
  const missingFields = findMissingRequiredFields(collectedInfo);
  if (missingFields.length > 0) {
    return SYSTEM_PROMPT + getInfoCollectionPrompt(collectedInfo, messages);
  }

  // 3. 정보 확인
  if (!conversation.confirmed) {
    return SYSTEM_PROMPT + getConfirmationPrompt(collectedInfo);
  }

  // 4. 추천 생성
  if (!conversation.packageId) {
    // Vector 검색 + 필터링으로 후보 콘텐츠 조회
    const candidates = await searchCandidateContents(collectedInfo);
    return SYSTEM_PROMPT + getRecommendationPrompt(collectedInfo, candidates);
  }

  // 5. 패키지 조정
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage.role === 'user') {
    return SYSTEM_PROMPT + getAdjustmentPrompt(
      lastUserMessage.content,
      conversation.package
    );
  }

  return SYSTEM_PROMPT;
}
```

#### 5. 토큰 최적화 전략

```typescript
/**
 * 긴 대화 히스토리 요약하여 토큰 절약
 */
function optimizeConversationContext(messages: Message[]): Message[] {
  const CONTEXT_WINDOW = 10; // 최근 10개 메시지만 유지

  if (messages.length <= CONTEXT_WINDOW) {
    return messages;
  }

  // 최근 메시지 유지
  const recentMessages = messages.slice(-CONTEXT_WINDOW);

  // 이전 메시지는 요약
  const olderMessages = messages.slice(0, -CONTEXT_WINDOW);
  const summary = summarizeMessages(olderMessages);

  return [
    { role: 'system', content: `[이전 대화 요약: ${summary}]` },
    ...recentMessages
  ];
}

function summarizeMessages(messages: Message[]): string {
  // 수집된 정보만 간단히 요약
  return "사용자로부터 기업명, 산업군, 교육 대상 정보를 수집함";
}
```

---

## 🔍 검색 및 추천 알고리즘

### 1. 하이브리드 검색 전략

#### A. 의미론적 검색 (Semantic Search)
- 콘텐츠 제목, 설명을 임베딩하여 Vector DB 저장
- 사용자 요구사항을 임베딩하여 유사도 계산
- Cosine Similarity 기반 상위 N개 후보 추출

#### B. 메타데이터 필터링
```typescript
interface SearchFilters {
  category?: string[]           // 카테고리
  minSessions?: number          // 최소 차시
  maxSessions?: number          // 최대 차시
  minPrice?: number             // 최소 교육비
  maxPrice?: number             // 최대 교육비
  developmentYear?: string[]    // 개발연도
  level?: string[]              // 난이도 (0차, 1차, 2차, 3차)
}
```

#### C. 비즈니스 로직 기반 스코어링
```typescript
function calculateRecommendationScore(
  content: Content,
  requirements: UserRequirements
): number {
  let score = 0

  // 의미론적 유사도 (40%)
  score += semanticSimilarity * 0.4

  // 예산 적합성 (25%)
  score += budgetFitness * 0.25

  // 난이도 적합성 (20%)
  score += levelFitness * 0.2

  // 최신성 (10%)
  score += recencyScore * 0.1

  // 인기도 (5%)
  score += popularityScore * 0.05

  return score
}
```

### 2. 추천 다양성 보장
- 동일 카테고리 콘텐츠 과다 방지
- 가격대 분산
- 난이도 단계별 균형

---

## 💻 API 엔드포인트 설계

### 1. 대화 API (핵심)

#### `POST /api/chat/start`
새로운 대화 세션 시작
```typescript
Request: {}
Response: {
  sessionId: string
  message: string  // AI 첫 인사 및 첫 질문
  collectedInfo: {}  // 빈 객체
}
```

#### `POST /api/chat/message`
메시지 전송 및 응답 (자동 패키징 포함)
```typescript
Request: {
  sessionId: string
  message: string
}
Response: {
  message: string       // AI 응답
  collectedInfo: {      // 현재까지 수집된 정보
    company?: string
    industry?: string
    employeeCount?: number
    targetGroup?: string
    skillLevel?: string
    learningGoal?: string
    duration?: string
    budget?: number
  }
  isComplete: boolean   // 필수 정보 수집 완료 여부
  packageId?: number    // 자동 생성된 패키지 ID (isComplete === true일 경우)
  recommendations?: Array<{  // 추천 콘텐츠 (isComplete === true일 경우)
    content: Content
    reason: string
    score: number
  }>
}
```

#### `GET /api/chat/session/:sessionId`
대화 세션 조회
```typescript
Response: {
  sessionId: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: DateTime
  }>
  collectedInfo: object
  packageId?: number
  status: 'active' | 'completed'
}
```

### 2. 패키지 API

#### `GET /api/packages`
패키지 목록 조회
```typescript
Query: {
  status?: 'active' | 'archived'
  company?: string
  limit?: number
  offset?: number
}
Response: {
  packages: Array<{
    id: number
    name: string
    targetCompany: string
    targetGroup: string
    itemCount: number
    totalPrice: number
    totalSessions: number
    createdAt: DateTime
  }>
  total: number
}
```

#### `GET /api/packages/:id`
패키지 상세 조회
```typescript
Response: {
  package: {
    id: number
    name: string
    description: string
    targetCompany: string
    targetGroup: string
    requirements: object
    status: string
    createdAt: DateTime
  }
  items: Array<{
    content: Content
    order: number
    reason: string
    score: number
  }>
  conversation: {
    messages: Array<{...}>
  }
  summary: {
    totalPrice: number
    totalSessions: number
    averageScore: number
  }
}
```

#### `PUT /api/packages/:id`
패키지 수정 (콘텐츠 추가/제거)
```typescript
Request: {
  addContentIds?: number[]     // 추가할 콘텐츠 ID
  removeContentIds?: number[]  // 제거할 콘텐츠 ID
  name?: string
  description?: string
}
Response: {
  package: Package
  items: PackageItem[]
}
```

#### `DELETE /api/packages/:id`
패키지 삭제 (아카이브)
```typescript
Response: {
  success: boolean
}
```

---

## 🎨 UI/UX 설계

### 1. 대화형 추천 인터페이스

#### 레이아웃
```
┌──────────────────────────────────────┐
│  Touch Contents CRM - AI 추천        │
├──────────────────────────────────────┤
│  ┌────────────────┐  ┌─────────────┐ │
│  │                │  │  추천 현황   │ │
│  │   대화 영역    │  │             │ │
│  │                │  │  - 선택된   │ │
│  │   [메시지]     │  │    콘텐츠   │ │
│  │   [메시지]     │  │  - 총 교육비│ │
│  │   [메시지]     │  │  - 총 차시  │ │
│  │                │  │             │ │
│  │   [입력창]     │  │  [패키지    │ │
│  │                │  │   생성]     │ │
│  └────────────────┘  └─────────────┘ │
└──────────────────────────────────────┘
```

#### 주요 컴포넌트

**ChatInterface**
- 메시지 표시 영역
- 사용자 입력 창
- 추천 질문 버튼

**RecommendationCard**
- 추천 콘텐츠 카드
- 추천 이유 표시
- 추가/제거 버튼

**PackageSummary**
- 선택된 콘텐츠 목록
- 총 비용 계산
- 총 차시 계산
- 패키지 생성 버튼

### 2. 패키지 관리 대시보드

#### 기능
- 생성된 패키지 목록
- 패키지 상세 정보
- 패키지 편집
- 배포 관리

---

## 🔧 구현 단계 (단순화)

### Phase 1: 기반 구축 (Week 1)

#### 1.1 데이터베이스 스키마 확장
- [ ] Package, PackageItem, Conversation 테이블 추가 (Prisma 스키마)
- [ ] ContentEmbedding 테이블 추가 (Vector 저장용)
- [ ] Prisma 마이그레이션 실행
- [ ] 기존 Content 테이블과 FK 관계 설정 (CASCADE)

#### 1.2 Vector DB 설정 및 초기 동기화
**결정**: PostgreSQL pgvector로 시작 (단순, 비용 절감)

- [ ] PostgreSQL pgvector 확장 설치
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] ContentEmbedding 테이블 vector 컬럼 추가
- [ ] 임베딩 생성 스크립트 작성 (`scripts/generate-embeddings.ts`)
- [ ] 전체 3,317개 콘텐츠 임베딩 생성 및 저장 (배치 처리)
  ```bash
  npm run generate-embeddings
  ```
- [ ] Pinecone 설정 준비 (옵션, 추후 전환 시)

#### 1.3 실시간 동기화 메커니즘
- [ ] Prisma Middleware 구현 (`src/lib/prisma.ts`)
  - Content CREATE → 임베딩 자동 생성
  - Content UPDATE → 임베딩 자동 갱신
  - Content DELETE → 임베딩 자동 삭제 (CASCADE)
- [ ] 동기화 Retry 로직 구현
- [ ] 동기화 실패 로그 시스템

#### 1.4 동기화 점검 도구
- [ ] Health Check 스크립트 (`scripts/check-sync.ts`)
- [ ] 누락 임베딩 자동 수정 스크립트 (`scripts/sync-missing.ts`)
- [ ] 주기적 점검 Cron Job 설정 (선택)

#### 1.5 AI API 설정
- [ ] ✅ OpenAI API 키 환경변수 설정 (.env에 이미 등록됨)
- [ ] System Prompt 템플릿 파일 작성 (`src/lib/prompts/system.ts`)
- [ ] 단계별 프롬프트 함수 구현
- [ ] LLM API 래퍼 함수 구현 (`src/lib/openai.ts`)

### Phase 2: AI 대화 에이전트 개발 (Week 2-3)

#### 2.1 대화 관리 시스템
- [ ] 세션 생성 및 관리 (`POST /api/chat/start`)
- [ ] 메시지 송수신 처리 (`POST /api/chat/message`)
- [ ] 대화 컨텍스트 유지 (메모리 또는 DB)

#### 2.2 필수 정보 수집 로직
- [ ] 필수 정보 항목 정의 (9가지 필수 질문)
- [ ] 질문 생성 프롬프트 작성
- [ ] 사용자 응답에서 정보 추출 (LLM 활용)
- [ ] 수집 완료 여부 판단 로직

#### 2.3 자동 추천 엔진
- [ ] Vector 검색 함수 구현
- [ ] 메타데이터 필터링 (예산, 차시, 카테고리)
- [ ] 스코어링 알고리즘 구현
- [ ] 추천 이유 자동 생성 (LLM)

#### 2.4 자동 패키지 생성
- [ ] 패키지 자동 생성 트리거
- [ ] Package 레코드 생성
- [ ] PackageItem 일괄 생성 (콘텐츠 참조)
- [ ] Conversation 저장

### Phase 3: UI 개발 (Week 4-5)

#### 3.1 대화 인터페이스
- [ ] 채팅 UI 컴포넌트
- [ ] 메시지 렌더링 (사용자/AI 구분)
- [ ] 입력창 및 전송
- [ ] 로딩 인디케이터
- [ ] 수집된 정보 표시 패널

#### 3.2 실시간 추천 결과 표시
- [ ] 추천 콘텐츠 카드 컴포넌트
- [ ] 추천 이유 표시
- [ ] 콘텐츠 상세 모달
- [ ] 총 교육비/차시 요약

#### 3.3 패키지 관리 페이지
- [ ] 패키지 목록 페이지
- [ ] 패키지 상세 페이지
- [ ] 패키지 수정 기능 (콘텐츠 추가/제거)
- [ ] 패키지 삭제 기능

#### 3.4 기존 CRM과 통합
- [ ] 네비게이션 메뉴에 "AI 추천" 추가
- [ ] 콘텐츠 목록에서 직접 패키지 추가 기능
- [ ] 일관된 디자인 시스템 적용

### Phase 4: 테스트 및 최적화 (Week 6)

#### 4.1 기능 테스트
- [ ] 대화 흐름 테스트
- [ ] 정보 수집 정확도 테스트
- [ ] 추천 품질 검증
- [ ] 패키지 생성 테스트

#### 4.2 성능 최적화
- [ ] LLM API 응답 시간 최적화 (스트리밍)
- [ ] Vector 검색 성능 개선
- [ ] 데이터베이스 쿼리 최적화
- [ ] 프론트엔드 렌더링 최적화

#### 4.3 사용자 테스트
- [ ] 내부 테스트 및 피드백 수집
- [ ] UI/UX 개선
- [ ] 버그 수정
- [ ] 문서화

---

## 🔐 보안 고려사항

### 1. API 보안
- ✅ OpenAI API 키 환경변수 관리 (.env)
- Rate limiting (API 호출 제한)
- 요청 검증 (세션 ID, 입력 값 검증)

### 2. 데이터 보안
- 대화 내용 개인정보 처리 주의
- 기업 정보 암호화 저장 (선택)
- 감사 로그 (패키지 생성/수정/삭제)

### 3. 인증/인가 (선택적)
- 사용자 인증 시스템 (추후 고려)
- 패키지 접근 권한 관리
- 세션 보안

---

## 📈 성능 고려사항

### 1. 응답 시간 최적화
- **LLM API 스트리밍**: 실시간으로 AI 응답 표시 (Server-Sent Events)
- **병렬 처리**: Vector 검색과 메타데이터 필터링 동시 수행
- **결과 캐싱**: 동일한 요구사항에 대한 추천 결과 캐시 (Redis 또는 메모리)

### 2. 확장성
- **Vector DB 인덱스 최적화**: 검색 성능 향상
- **데이터베이스 연결 풀링**: Prisma 기본 지원
- **페이지네이션**: 대화 목록, 패키지 목록

### 3. 비용 최적화
- **프롬프트 최적화**: 불필요한 토큰 사용 최소화
- **모델 선택**: GPT-4 vs GPT-3.5 상황별 사용
- **토큰 사용량 모니터링**: 월간 비용 추적
- **캐싱**: 중복 요청 방지

---

## 🧪 테스트 전략

### 1. 단위 테스트
- 추천 알고리즘 검증
- API 엔드포인트 테스트
- 유틸리티 함수 테스트

### 2. 통합 테스트
- AI 에이전트 대화 플로우
- 패키지 생성 프로세스
- 배포 프로세스

### 3. E2E 테스트
- 전체 사용자 시나리오
- 다양한 요구사항 케이스
- 에러 시나리오

---

## 📊 평가 지표

### 1. 추천 품질
- **정보 수집 완성률**: 대화 시작 후 필수 정보 수집 완료 비율
- **패키지 생성률**: 대화 완료 후 실제 패키지 생성 비율
- **평균 대화 턴 수**: 패키지 생성까지 걸린 평균 질문/응답 횟수

### 2. 성능
- **평균 AI 응답 시간**: 메시지당 평균 응답 시간 (목표: <3초)
- **추천 생성 시간**: 추천 콘텐츠 생성 시간 (목표: <5초)
- **API 에러율**: LLM API 및 전체 API 에러 비율

### 3. 비즈니스
- **패키지 생성 수**: 일/주/월별 생성된 패키지 수
- **패키지 수정률**: 생성 후 수정된 패키지 비율
- **평균 패키지 가치**: 패키지당 평균 총 교육비

---

## 🚀 배포 및 운영

### 1. 배포 환경
- **개발 환경**: 로컬 개발 (localhost:3000)
- **프로덕션**: Vercel 배포
- **데이터베이스**: PostgreSQL (Vercel Postgres 또는 별도 호스팅)

### 2. 모니터링
- **로그 집계**: Console 로그 → Vercel 로그
- **에러 추적**: Sentry (선택)
- **API 사용량**: OpenAI Usage Dashboard

### 3. 문서화
- **개발 문서**: 이 계획서 + README
- **API 문서**: TypeScript 타입 정의
- **사용자 가이드**: UI 내 도움말

---

## 📝 향후 개선사항 (v2.0)

### 1. AI 에이전트 고도화
- **멀티턴 대화 개선**: 더 자연스러운 대화 흐름
- **컨텍스트 기억**: 이전 대화 세션 참조
- **다국어 지원**: 영어, 중국어 등

### 2. 추천 알고리즘 고도화
- **협업 필터링**: 유사 기업의 선택 패턴 학습
- **피드백 학습**: 패키지 수정 이력 기반 개선
- **A/B 테스트**: 추천 알고리즘 성능 비교

### 3. 부가 기능
- **학습 로드맵 시각화**: 추천 콘텐츠의 학습 경로 그래프
- **예산 시뮬레이션**: 예산 조정 시 추천 변화 실시간 반영
- **패키지 공유**: 다른 기업과 패키지 공유 기능

### 4. 통합 (Phase 2)
- **LMS 연동**: 패키지를 직접 LMS에 배포 (이 단계에서 포팅 고려)
- **결제 시스템**: 패키지 구매 기능
- **분석 대시보드**: 패키지 사용 현황 및 효과 분석

---

## 📚 참고 자료

### LLM & AI
- OpenAI API Documentation
- Anthropic Claude API
- LangChain Documentation

### Vector Database
- Pinecone Documentation
- Qdrant Documentation

### Next.js & React
- Next.js 14 Documentation
- React Server Components

---

## 부록 A: 샘플 대화 시나리오

### 시나리오 1: 개발팀 신입 교육

```
[대화 시작]

AI: 안녕하세요! Touch Contents AI 추천 시스템입니다. 😊
    귀사에 맞는 교육 콘텐츠를 추천해드리겠습니다.
    먼저, 회사명을 알려주시겠어요?

User: ABC 테크놀로지입니다.

AI: ABC 테크놀로지, 알겠습니다!
    어떤 산업 분야에 속해 계신가요? (예: IT, 제조, 금융, 서비스 등)

User: IT 산업이고, 웹 서비스 개발 회사입니다.

AI: 웹 서비스 개발 회사시군요! 👍
    이번 교육 대상 인원은 몇 명 정도이신가요?

User: 신입 개발자 5명입니다.

AI: 신입 개발자 5명이시군요.
    이분들의 주요 직무나 담당 분야는 무엇인가요?
    (예: 프론트엔드, 백엔드, 풀스택 등)

User: 풀스택 개발자로 채용했는데, 주로 React와 Node.js를 사용할 예정입니다.

AI: React와 Node.js 풀스택 개발자시군요.
    현재 이분들의 해당 기술 스킬 레벨은 어느 정도인가요?
    (입문, 초급, 중급, 고급 중에서)

User: 대부분 학교에서 기초만 배운 초급 수준입니다.

AI: 초급 레벨이시군요. 이해했습니다.
    이번 교육을 통해 어떤 역량을 개발하고 싶으신가요?
    (구체적인 학습 목표를 말씀해주세요)

User: 실제 웹 서비스를 개발할 수 있는 실무 역량을 키우고 싶습니다.
      특히 React와 Node.js를 활용한 프로젝트 경험이 필요합니다.

AI: 실무 프로젝트 역량 강화가 목표시군요! 👌
    예상하시는 교육 기간은 어느 정도인가요?

User: 2-3개월 정도 생각하고 있습니다.

AI: 2-3개월이시군요.
    마지막으로, 1인당 교육 예산은 어느 정도로 계획하고 계신가요?

User: 1인당 150만원 정도입니다.

AI: 완벽합니다! 수집된 정보를 정리해드릴게요:

    📋 **교육 요구사항 요약**
    - 회사: ABC 테크놀로지 (IT/웹 서비스)
    - 대상: 신입 풀스택 개발자 5명
    - 기술: React, Node.js
    - 현재 레벨: 초급
    - 목표: 실무 프로젝트 역량 강화
    - 기간: 2-3개월
    - 예산: 1인당 150만원

    이 정보로 최적의 콘텐츠를 추천해드리겠습니다! 🔍

    [추천 콘텐츠 생성 중...]

AI: 추천이 완료되었습니다! 총 6개의 콘텐츠를 선정했습니다.

    📦 **추천 패키지: "ABC 신입 개발자 풀스택 양성 과정"**

    1️⃣ React 기초부터 실전까지
       - 차시: 20차시
       - 교육비: 500,000원
       - 추천 이유: React의 핵심 개념과 실무 패턴을 체계적으로 학습

    2️⃣ Node.js 백엔드 개발
       - 차시: 15차시
       - 교육비: 450,000원
       - 추천 이유: REST API 설계와 데이터베이스 연동 실습

    3️⃣ 풀스택 프로젝트 실습
       - 차시: 10차시
       - 교육비: 300,000원
       - 추천 이유: 실제 서비스 개발 프로젝트 경험

    4️⃣ Git & GitHub 협업
       - 차시: 5차시
       - 교육비: 150,000원
       - 추천 이유: 실무 필수 버전 관리 및 협업 스킬

    5️⃣ 웹 성능 최적화
       - 차시: 8차시
       - 교육비: 200,000원
       - 추천 이유: 실무 수준의 성능 개선 기법

    💰 **총 교육비**: 1,600,000원/인 (예산: 1,500,000원)
    ⏱️ **총 차시**: 58차시
    📅 **예상 기간**: 약 2.5개월 (주 5차시 기준)

    예산을 약간 초과했네요. 조정이 필요하시면 말씀해주세요!

User: "웹 성능 최적화"를 빼주세요.

AI: 알겠습니다! "웹 성능 최적화"를 제거했습니다.

    📦 **업데이트된 패키지**

    💰 **총 교육비**: 1,400,000원/인 ✅
    ⏱️ **총 차시**: 50차시
    📅 **예상 기간**: 약 2개월

    예산 내에 맞췄습니다! 패키지를 저장하시겠어요?

User: 네, 저장해주세요.

AI: ✅ 패키지가 저장되었습니다!
    패키지 ID: #123
    언제든지 패키지 목록에서 확인하고 수정할 수 있습니다.
    추가 문의사항이 있으시면 언제든 말씀해주세요! 😊
```

### 시나리오 특징
- **체계적인 질문**: 필수 정보를 순서대로 수집
- **자연스러운 대화**: 친근하고 이해하기 쉬운 표현
- **즉각적인 확인**: 수집된 정보를 중간에 요약
- **구체적인 추천 이유**: 각 콘텐츠를 왜 선택했는지 설명
- **실시간 조정**: 사용자 피드백에 따라 즉시 패키지 수정
- **자동 패키지 생성**: 대화 완료 시 자동으로 DB 저장

---

## 부록 B: 데이터 구조 예시

### 패키지 JSON 구조
```json
{
  "id": 1,
  "name": "신입 웹 개발자 교육 패키지",
  "description": "React와 Node.js를 활용한 풀스택 웹 개발 교육",
  "targetCompany": "ABC IT Company",
  "targetGroup": "신입 개발자",
  "items": [
    {
      "contentId": 123,
      "courseName": "React 기초부터 실전까지",
      "sessions": 20,
      "educationFee": 500000,
      "reason": "React 프레임워크의 핵심 개념을 체계적으로 학습"
    },
    {
      "contentId": 456,
      "courseName": "Node.js 백엔드 개발",
      "sessions": 15,
      "educationFee": 450000,
      "reason": "서버 개발의 기초와 REST API 구축 능력 배양"
    }
  ],
  "totalSessions": 35,
  "totalFee": 950000,
  "createdAt": "2024-11-26T00:00:00Z"
}
```

---

---

## 📌 문서 정보

**문서 버전**: 3.0 (프롬프팅 & Vector DB 상세화)
**작성일**: 2024-11-26
**최종 업데이트**: 2024-11-26
**작성자**: AI Planning System

### 주요 변경사항 (v3.0)
- ✅ **프롬프팅 전략 대폭 보강**: 단계별 프롬프트 템플릿, Few-shot Examples, 프롬프트 체이닝
- ✅ **Vector DB 아키텍처 명확화**: PostgreSQL RDS가 Source of Truth, Vector DB는 검색 보조
- ✅ **동기화 전략 상세화**: Prisma Middleware로 실시간 동기화, Health Check 도구
- ✅ **초기 결정**: pgvector로 시작 (비용 절감), 필요 시 Pinecone 전환
- ✅ **동기화 흐름 완성**: Create/Update/Delete 시 자동 임베딩 동기화

### v2.0 주요 변경사항
- ✅ AI 대화를 통한 필수 정보 수집 프로세스 명확화
- ✅ 콘텐츠 패키징 구조 단순화 (기존 Content 테이블 참조만)
- ✅ 자동 패키지 생성 흐름 추가
- ✅ 포팅 시스템 제거 (현재 단계에서 불필요)
- ✅ 구현 단계 6주로 단순화

### 기술 환경
- ✅ Next.js 14 + TypeScript
- ✅ PostgreSQL RDS + Prisma
- ✅ OpenAI API (text-embedding-3-small, GPT-4)
- ✅ PostgreSQL pgvector (Vector DB, 초기 선택)
- 🔲 Pinecone (옵션, 성능 이슈 시 전환)
- 🔲 Shadcn/ui (UI 컴포넌트)

### 핵심 아키텍처 결정
1. **Data Source**: PostgreSQL RDS Content 테이블 = Single Source of Truth
2. **Vector DB**: 검색 성능 향상을 위한 보조 인덱스 (pgvector 사용)
3. **동기화**: Prisma Middleware로 Content 변경 시 자동 임베딩 동기화
4. **프롬프팅**: 5단계 프롬프트 체이닝 (수집 → 확인 → 추천 생성 → 제시 → 조정)

### 다음 단계
1. Prisma 스키마 업데이트 (Package, PackageItem, Conversation, ContentEmbedding)
2. pgvector 확장 설치 및 초기 임베딩 생성 (3,317개)
3. Prisma Middleware 구현 (실시간 동기화)
4. 프롬프트 템플릿 파일 작성
5. 채팅 UI 컴포넌트 개발

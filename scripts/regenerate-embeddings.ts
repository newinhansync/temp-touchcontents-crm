/**
 * 임베딩 재생성 스크립트
 *
 * 모든 콘텐츠의 임베딩을 새로운 generateContentText 함수를 사용하여 재생성합니다.
 * 이를 통해 과정소개, 학습목표, 학습대상, 커리큘럼 등의 상세 정보가 임베딩에 반영됩니다.
 *
 * 사용법:
 * npx tsx scripts/regenerate-embeddings.ts
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { generateContentText } from '../src/lib/embedding-utils'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const BATCH_SIZE = 20 // OpenAI 배치 크기
const DELAY_MS = 1000 // API 호출 간 딜레이

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return response.data.map(d => d.embedding)
}

async function main() {
  console.log('🚀 임베딩 재생성 스크립트 시작')
  console.log('━'.repeat(50))

  // 1. 모든 콘텐츠 조회
  const contents = await prisma.content.findMany({
    orderBy: { id: 'asc' }
  })

  console.log(`📊 총 콘텐츠 수: ${contents.length}개`)
  console.log(`📦 배치 크기: ${BATCH_SIZE}개`)
  console.log(`⏱️  배치 간 딜레이: ${DELAY_MS}ms`)
  console.log('━'.repeat(50))

  // 2. 기존 임베딩 삭제
  console.log('\n🗑️  기존 임베딩 삭제 중...')
  await prisma.contentEmbedding.deleteMany({})
  console.log('✅ 기존 임베딩 삭제 완료')

  // 3. 배치 처리
  let processedCount = 0
  let errorCount = 0
  const totalBatches = Math.ceil(contents.length / BATCH_SIZE)

  for (let i = 0; i < contents.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const batch = contents.slice(i, i + BATCH_SIZE)

    console.log(`\n📝 배치 ${batchNum}/${totalBatches} 처리 중... (${batch.length}개)`)

    try {
      // 각 콘텐츠에 대해 향상된 텍스트 생성
      const texts = batch.map(content => {
        const text = generateContentText(content)
        // 텍스트가 너무 길면 자르기 (OpenAI 제한)
        return text.length > 8000 ? text.slice(0, 8000) : text
      })

      // 배치 임베딩 생성
      const embeddings = await generateEmbeddingsBatch(texts)

      // DB에 저장
      for (let j = 0; j < batch.length; j++) {
        await prisma.contentEmbedding.create({
          data: {
            contentId: batch[j].id,
            embedding: JSON.stringify(embeddings[j]),
          }
        })
      }

      processedCount += batch.length
      console.log(`   ✅ 완료: ${processedCount}/${contents.length} (${((processedCount / contents.length) * 100).toFixed(1)}%)`)

      // 다음 배치 전 딜레이
      if (i + BATCH_SIZE < contents.length) {
        await sleep(DELAY_MS)
      }
    } catch (error) {
      console.error(`   ❌ 배치 ${batchNum} 처리 중 오류:`, error)
      errorCount += batch.length

      // 개별 처리 시도
      console.log('   🔄 개별 처리 시도 중...')
      for (const content of batch) {
        try {
          const text = generateContentText(content)
          const truncatedText = text.length > 8000 ? text.slice(0, 8000) : text

          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: truncatedText,
          })

          await prisma.contentEmbedding.create({
            data: {
              contentId: content.id,
              embedding: JSON.stringify(response.data[0].embedding),
            }
          })

          processedCount++
          errorCount--
          await sleep(200)
        } catch (individualError) {
          console.error(`      ❌ 콘텐츠 ID ${content.id} 처리 실패:`, individualError)
        }
      }
    }
  }

  // 4. 결과 요약
  console.log('\n' + '━'.repeat(50))
  console.log('📊 임베딩 재생성 완료')
  console.log('━'.repeat(50))
  console.log(`✅ 성공: ${processedCount}개`)
  console.log(`❌ 실패: ${errorCount}개`)

  // 5. 검증
  const embeddingCount = await prisma.contentEmbedding.count()
  console.log(`📈 DB 임베딩 수: ${embeddingCount}개`)

  // 6. 샘플 확인
  const sample = await prisma.contentEmbedding.findFirst({
    include: { content: true }
  })

  if (sample) {
    console.log('\n📝 샘플 확인:')
    console.log(`   콘텐츠: ${sample.content.courseName}`)
    console.log(`   임베딩 길이: ${JSON.parse(sample.embedding).length}`)
  }

  await prisma.$disconnect()
  console.log('\n✨ 스크립트 완료!')
}

main().catch(async (error) => {
  console.error('스크립트 실행 오류:', error)
  await prisma.$disconnect()
  process.exit(1)
})

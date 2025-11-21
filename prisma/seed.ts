import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { config } from 'dotenv'

config()

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/touchcontents_crm?schema=public'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// 컬럼명 매핑 (Excel 컬럼명에 공백과 줄바꿈 포함)
const columnMapping: Record<string, string> = {
  '대분류': 'majorCategory',
  '중분류': 'middleCategory',
  ' 소분류': 'minorCategory',
  '0차': 'level0',
  '1차': 'level1',
  '2차': 'level2',
  '3차': 'level3',
  '세부내용': 'detailContent',
  '자격증 여부': 'certificationStatus',
  '비고': 'note',
  '구분': 'category',
  '__EMPTY': 'categoryCode',
  '과정명': 'courseName',
  '구분/': 'categoryRef',
  '상태': 'status',
  '차시': 'sessions',
  '과정소개': 'courseIntro',
  '학습내용\n(목차)': 'curriculum',
  '개발연도': 'developmentYear',
  'SME': 'sme',
  ' 교육비\n(도서비제외)': 'educationFee',
  ' 총 교육비\n(도서비포함)': 'totalFee',
  ' 맛보기': 'sampleLink',
  ' 코스 ID': 'courseId',
  ' 콘텐츠 ID': 'contentId',
  ' DSBL보존가\n(도서제외)': 'dsblPrice',
  ' 턴키가능여부\n(건발건협의)': 'turnkeyAvailable',
  '학습대상': 'targetAudience',
  '학습목표': 'learningObjective',
  '교육\n기간': 'educationPeriod',
  '도서비': 'bookFee',
  '도서필수': 'bookRequired',
}

// 값 변환 함수
function transformValue(key: string, value: any): any {
  // NULL 또는 빈 값 처리
  if (value === null || value === undefined || value === '') {
    return null
  }

  // 숫자 타입 변환
  if (key === 'sessions' || key === 'educationFee') {
    const num = parseInt(String(value), 10)
    return isNaN(num) ? 0 : num
  }

  if (key === 'totalFee' || key === 'dsblPrice') {
    const num = parseFloat(String(value))
    return isNaN(num) ? null : num
  }

  // 문자열 변환
  return String(value).trim()
}

// 컬럼 인덱스를 Excel 컬럼 문자로 변환 (0 -> A, 1 -> B, 26 -> AA 등)
function getColumnLetter(colIndex: number): string {
  let letter = ''
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter
    colIndex = Math.floor(colIndex / 26) - 1
  }
  return letter
}

// 워크시트에서 하이퍼링크 추출
function extractHyperlinks(worksheet: XLSX.WorkSheet): Map<string, string> {
  const hyperlinks = new Map<string, string>()

  // 워크시트의 하이퍼링크 정보 확인
  if (worksheet['!hyperlinks']) {
    for (const link of worksheet['!hyperlinks']) {
      hyperlinks.set(link.ref, link.Target)
    }
  }

  // 셀별로 하이퍼링크 확인
  for (const cellAddress in worksheet) {
    if (cellAddress[0] === '!') continue
    const cell = worksheet[cellAddress]
    if (cell && cell.l && cell.l.Target) {
      hyperlinks.set(cellAddress, cell.l.Target)
    }
  }

  return hyperlinks
}

async function main() {
  console.log('Starting data migration...')

  // Excel 파일 읽기
  const filePath = path.join(__dirname, '..', 'res', 'contentsList.xlsx')
  console.log(`Reading Excel file from: ${filePath}`)

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // 하이퍼링크 추출
  const hyperlinks = extractHyperlinks(worksheet)
  console.log(`Found ${hyperlinks.size} hyperlinks in worksheet`)

  // 헤더 행에서 sampleLink 컬럼 인덱스 찾기
  const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]
  const sampleLinkColIndex = headers.findIndex(h => h && h.includes('맛보기'))
  const sampleLinkColLetter = sampleLinkColIndex >= 0 ? getColumnLetter(sampleLinkColIndex) : null
  console.log(`Sample link column: ${sampleLinkColLetter} (index: ${sampleLinkColIndex})`)

  // JSON으로 변환
  const rawData = XLSX.utils.sheet_to_json(worksheet)
  console.log(`Total records found: ${rawData.length}`)

  // 데이터 변환
  const transformedData = rawData.map((row: any, index: number) => {
    const transformed: Record<string, any> = {}

    for (const [originalKey, mappedKey] of Object.entries(columnMapping)) {
      const value = row[originalKey]
      transformed[mappedKey] = transformValue(mappedKey, value)
    }

    // sampleLink에 하이퍼링크 URL 적용 (index + 2: 헤더 행 + 0-based index)
    if (sampleLinkColLetter) {
      const cellAddress = `${sampleLinkColLetter}${index + 2}`
      const hyperlinkUrl = hyperlinks.get(cellAddress)
      if (hyperlinkUrl) {
        transformed.sampleLink = hyperlinkUrl
      }
    }

    // curriculum을 배열로 변환
    if (transformed.curriculum && typeof transformed.curriculum === 'string') {
      const items = transformed.curriculum.split('\n').map((item: string) => item.trim()).filter((item: string) => item !== '')
      transformed.curriculum = items.length > 0 ? items : null
    }

    // 필수 필드 기본값 설정
    if (!transformed.majorCategory) transformed.majorCategory = ''
    if (!transformed.middleCategory) transformed.middleCategory = ''
    if (!transformed.minorCategory) transformed.minorCategory = ''
    if (!transformed.category) transformed.category = ''
    if (!transformed.categoryCode) transformed.categoryCode = ''
    if (!transformed.courseName) transformed.courseName = ''
    if (!transformed.categoryRef) transformed.categoryRef = ''
    if (transformed.sessions === null) transformed.sessions = 0
    if (transformed.educationFee === null) transformed.educationFee = 0

    return transformed
  })

  console.log('Data transformation complete.')

  // 기존 데이터 삭제
  console.log('Clearing existing data...')
  await prisma.content.deleteMany()

  // 배치 삽입 (100개씩)
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize)

    await prisma.content.createMany({
      data: batch as Prisma.ContentCreateManyInput[],
    })

    inserted += batch.length
    console.log(`Inserted ${inserted}/${transformedData.length} records...`)
  }

  console.log(`\nMigration complete! Total records inserted: ${inserted}`)

  // 검증
  const count = await prisma.content.count()
  console.log(`Verification: ${count} records in database`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

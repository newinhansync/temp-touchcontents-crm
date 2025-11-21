import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Build where clause (same as main API)
    const where: Prisma.ContentWhereInput = {}

    // Category filters
    const majorCategory = searchParams.get('majorCategory')
    if (majorCategory) where.majorCategory = majorCategory

    const middleCategory = searchParams.get('middleCategory')
    if (middleCategory) where.middleCategory = middleCategory

    const minorCategory = searchParams.get('minorCategory')
    if (minorCategory) where.minorCategory = minorCategory

    // Level filters
    const level0 = searchParams.get('level0')
    if (level0) where.level0 = level0

    const level1 = searchParams.get('level1')
    if (level1) where.level1 = level1

    const level2 = searchParams.get('level2')
    if (level2) where.level2 = level2

    const level3 = searchParams.get('level3')
    if (level3) where.level3 = level3

    // Status filter (multiple)
    const status = searchParams.getAll('status')
    if (status.length > 0) where.status = { in: status }

    // Category filter (multiple)
    const category = searchParams.getAll('category')
    if (category.length > 0) where.category = { in: category }

    // Development year
    const developmentYear = searchParams.get('developmentYear')
    if (developmentYear) where.developmentYear = developmentYear

    // Turnkey available
    const turnkeyAvailable = searchParams.get('turnkeyAvailable')
    if (turnkeyAvailable) where.turnkeyAvailable = turnkeyAvailable

    // Education fee range
    const minEducationFee = searchParams.get('minEducationFee')
    const maxEducationFee = searchParams.get('maxEducationFee')
    if (minEducationFee || maxEducationFee) {
      where.educationFee = {}
      if (minEducationFee) where.educationFee.gte = parseInt(minEducationFee)
      if (maxEducationFee) where.educationFee.lte = parseInt(maxEducationFee)
    }

    // Sessions range
    const minSessions = searchParams.get('minSessions')
    const maxSessions = searchParams.get('maxSessions')
    if (minSessions || maxSessions) {
      where.sessions = {}
      if (minSessions) where.sessions.gte = parseInt(minSessions)
      if (maxSessions) where.sessions.lte = parseInt(maxSessions)
    }

    // Text search
    const search = searchParams.get('search')
    const searchField = searchParams.get('searchField') || 'all'

    if (search) {
      const searchCondition = { contains: search, mode: Prisma.QueryMode.insensitive }

      if (searchField === 'all') {
        where.OR = [
          { courseName: searchCondition },
          { courseIntro: searchCondition },
          { sme: searchCondition },
          { learningObjective: searchCondition },
        ]
      } else {
        where[searchField as keyof typeof where] = searchCondition
      }
    }

    // Selected IDs for export
    const selectedIds = searchParams.get('ids')
    if (selectedIds) {
      const ids = selectedIds.split(',').map((id) => parseInt(id))
      where.id = { in: ids }
    }

    // Fetch data
    const data = await prisma.content.findMany({
      where,
      orderBy: { id: 'asc' },
    })

    // Transform to Korean column names
    const exportData = data.map((item) => ({
      '대분류': item.majorCategory,
      '중분류': item.middleCategory,
      '소분류': item.minorCategory,
      '0차': item.level0,
      '1차': item.level1,
      '2차': item.level2,
      '3차': item.level3,
      '세부내용': item.detailContent,
      '자격증 여부': item.certificationStatus,
      '비고': item.note,
      '구분': item.category,
      '코드': item.categoryCode,
      '과정명': item.courseName,
      '구분/': item.categoryRef,
      '상태': item.status,
      '차시': item.sessions,
      '과정소개': item.courseIntro,
      '학습내용(목차)': item.curriculum,
      '개발연도': item.developmentYear,
      'SME': item.sme,
      '교육비(도서비제외)': item.educationFee,
      '총 교육비(도서비포함)': item.totalFee,
      '맛보기': item.sampleLink,
      '코스 ID': item.courseId,
      '콘텐츠 ID': item.contentId,
      'DSBL보존가(도서제외)': item.dsblPrice,
      '턴키가능여부': item.turnkeyAvailable,
      '학습대상': item.targetAudience,
      '학습목표': item.learningObjective,
      '교육기간': item.educationPeriod,
      '도서비': item.bookFee,
      '도서필수': item.bookRequired,
    }))

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contents')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="contents_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exporting contents:', error)
    return NextResponse.json(
      { error: 'Failed to export contents' },
      { status: 500 }
    )
  }
}

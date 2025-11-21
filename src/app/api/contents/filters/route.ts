import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Get parent filters for hierarchical filtering
    const parentMajorCategory = searchParams.get('majorCategory')
    const parentMiddleCategory = searchParams.get('middleCategory')
    const parentLevel0 = searchParams.get('level0')
    const parentLevel1 = searchParams.get('level1')
    const parentLevel2 = searchParams.get('level2')

    // Build where clause for hierarchical filters
    const categoryWhere: any = {}
    if (parentMajorCategory) categoryWhere.majorCategory = parentMajorCategory
    if (parentMiddleCategory) categoryWhere.middleCategory = parentMiddleCategory

    const levelWhere: any = {}
    if (parentLevel0) levelWhere.level0 = parentLevel0
    if (parentLevel1) levelWhere.level1 = parentLevel1
    if (parentLevel2) levelWhere.level2 = parentLevel2

    // Fetch all filter options in parallel
    const [
      majorCategories,
      middleCategories,
      minorCategories,
      level0Options,
      level1Options,
      level2Options,
      level3Options,
      statuses,
      categories,
      developmentYears,
      turnkeyOptions,
      feeRange,
      sessionsRange,
    ] = await Promise.all([
      // Major categories (always all)
      prisma.content.findMany({
        select: { majorCategory: true },
        distinct: ['majorCategory'],
        orderBy: { majorCategory: 'asc' },
      }),
      // Middle categories (filtered by major)
      prisma.content.findMany({
        where: categoryWhere,
        select: { middleCategory: true },
        distinct: ['middleCategory'],
        orderBy: { middleCategory: 'asc' },
      }),
      // Minor categories (filtered by major and middle)
      prisma.content.findMany({
        where: categoryWhere,
        select: { minorCategory: true },
        distinct: ['minorCategory'],
        orderBy: { minorCategory: 'asc' },
      }),
      // Level 0 (always all)
      prisma.content.findMany({
        select: { level0: true },
        distinct: ['level0'],
        orderBy: { level0: 'asc' },
      }),
      // Level 1 (filtered by level0)
      prisma.content.findMany({
        where: levelWhere,
        select: { level1: true },
        distinct: ['level1'],
        orderBy: { level1: 'asc' },
      }),
      // Level 2 (filtered by level0, level1)
      prisma.content.findMany({
        where: levelWhere,
        select: { level2: true },
        distinct: ['level2'],
        orderBy: { level2: 'asc' },
      }),
      // Level 3 (filtered by level0, level1, level2)
      prisma.content.findMany({
        where: levelWhere,
        select: { level3: true },
        distinct: ['level3'],
        orderBy: { level3: 'asc' },
      }),
      // Statuses
      prisma.content.findMany({
        select: { status: true },
        distinct: ['status'],
        orderBy: { status: 'asc' },
      }),
      // Categories
      prisma.content.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      // Development years
      prisma.content.findMany({
        select: { developmentYear: true },
        distinct: ['developmentYear'],
        orderBy: { developmentYear: 'desc' },
      }),
      // Turnkey options
      prisma.content.findMany({
        select: { turnkeyAvailable: true },
        distinct: ['turnkeyAvailable'],
        orderBy: { turnkeyAvailable: 'asc' },
      }),
      // Education fee range
      prisma.content.aggregate({
        _min: { educationFee: true },
        _max: { educationFee: true },
      }),
      // Sessions range
      prisma.content.aggregate({
        _min: { sessions: true },
        _max: { sessions: true },
      }),
    ])

    return NextResponse.json({
      majorCategories: majorCategories.map((c) => c.majorCategory),
      middleCategories: middleCategories.map((c) => c.middleCategory),
      minorCategories: minorCategories.map((c) => c.minorCategory),
      level0: level0Options.map((l) => l.level0).filter(Boolean),
      level1: level1Options.map((l) => l.level1).filter(Boolean),
      level2: level2Options.map((l) => l.level2).filter(Boolean),
      level3: level3Options.map((l) => l.level3).filter(Boolean),
      statuses: statuses.map((s) => s.status).filter(Boolean),
      categories: categories.map((c) => c.category),
      developmentYears: developmentYears.map((d) => d.developmentYear).filter(Boolean),
      turnkeyOptions: turnkeyOptions.map((t) => t.turnkeyAvailable).filter(Boolean),
      educationFeeRange: {
        min: feeRange._min.educationFee || 0,
        max: feeRange._max.educationFee || 0,
      },
      sessionsRange: {
        min: sessionsRange._min.sessions || 0,
        max: sessionsRange._max.sessions || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching filters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    )
  }
}

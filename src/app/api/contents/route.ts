import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'id'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
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

    // Execute queries
    const [data, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.content.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching contents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const content = await prisma.content.create({
      data: body,
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}

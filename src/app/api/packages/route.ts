import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Build where clause
    const where: Record<string, unknown> = {}

    // Status filter: 'all' means no filter, otherwise filter by status
    if (statusParam && statusParam !== 'all') {
      where.status = statusParam
    }

    // Search filter: search in name or targetCompany
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { targetCompany: { contains: search, mode: 'insensitive' } }
      ]
    }

    const skip = (page - 1) * pageSize

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        include: {
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip
      }),
      prisma.package.count({ where })
    ])

    // Transform to match frontend interface
    const data = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      targetCompany: pkg.targetCompany,
      targetGroup: pkg.targetGroup,
      status: pkg.status,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      _count: {
        items: pkg._count.items
      }
    }))

    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Get packages error:', error)
    return NextResponse.json(
      { error: '패키지 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

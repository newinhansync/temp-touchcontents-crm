import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [totalPackages, activePackages, totalContentsInPackages, contentCount] = await Promise.all([
      prisma.package.count(),
      prisma.package.count({ where: { status: 'active' } }),
      prisma.packageItem.count(),
      prisma.content.count()
    ])

    return NextResponse.json({
      totalPackages,
      activePackages,
      totalContentsInPackages,
      contentCount
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: '통계를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

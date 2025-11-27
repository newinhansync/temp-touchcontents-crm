import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packageId = parseInt(id)

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        items: {
          include: {
            content: true
          },
          orderBy: { order: 'asc' }
        },
        conversation: true
      }
    })

    if (!pkg) {
      return NextResponse.json(
        { error: '패키지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const totalPrice = pkg.items.reduce((sum, item) => sum + item.content.educationFee, 0)
    const totalSessions = pkg.items.reduce((sum, item) => sum + item.content.sessions, 0)
    const averageScore = pkg.items.length > 0
      ? pkg.items.reduce((sum, item) => sum + item.score, 0) / pkg.items.length
      : 0

    return NextResponse.json({
      package: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        targetCompany: pkg.targetCompany,
        targetGroup: pkg.targetGroup,
        requirements: pkg.requirements,
        status: pkg.status,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt
      },
      items: pkg.items.map(item => ({
        content: item.content,
        order: item.order,
        reason: item.reason,
        score: item.score
      })),
      conversation: pkg.conversation,
      summary: {
        totalPrice,
        totalSessions,
        averageScore: Math.round(averageScore * 10) / 10
      }
    })
  } catch (error) {
    console.error('Get package error:', error)
    return NextResponse.json(
      { error: '패키지를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packageId = parseInt(id)
    const body = await request.json()

    const { addContentIds, removeContentIds, name, description } = body as {
      addContentIds?: number[]
      removeContentIds?: number[]
      name?: string
      description?: string
    }

    // Update package name/description if provided
    if (name || description) {
      await prisma.package.update({
        where: { id: packageId },
        data: {
          ...(name && { name }),
          ...(description && { description })
        }
      })
    }

    // Remove contents if specified
    if (removeContentIds && removeContentIds.length > 0) {
      await prisma.packageItem.deleteMany({
        where: {
          packageId,
          contentId: { in: removeContentIds }
        }
      })
    }

    // Add contents if specified
    if (addContentIds && addContentIds.length > 0) {
      // Get current max order
      const maxOrderItem = await prisma.packageItem.findFirst({
        where: { packageId },
        orderBy: { order: 'desc' }
      })
      const startOrder = (maxOrderItem?.order || 0) + 1

      await prisma.packageItem.createMany({
        data: addContentIds.map((contentId, index) => ({
          packageId,
          contentId,
          order: startOrder + index,
          reason: 'AI 추천 또는 사용자 추가',
          score: 70
        })),
        skipDuplicates: true
      })
    }

    // Return updated package
    const updatedPackage = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        items: {
          include: {
            content: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json({
      package: updatedPackage,
      items: updatedPackage?.items
    })
  } catch (error) {
    console.error('Update package error:', error)
    return NextResponse.json(
      { error: '패키지 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const packageId = parseInt(id)

    // Archive (soft delete) instead of hard delete
    await prisma.package.update({
      where: { id: packageId },
      data: { status: 'archived' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete package error:', error)
    return NextResponse.json(
      { error: '패키지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

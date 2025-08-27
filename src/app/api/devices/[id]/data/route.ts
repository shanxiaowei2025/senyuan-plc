import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/devices/[id]/data - 获取设备数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const dataType = searchParams.get('dataType') || ''
    const startTime = searchParams.get('startTime') || ''
    const endTime = searchParams.get('endTime') || ''

    // 构建查询条件
    const where: any = {
      deviceId: id
    }
    
    if (dataType) {
      where.dataType = dataType
    }
    
    if (startTime || endTime) {
      where.timestamp = {}
      if (startTime) {
        where.timestamp.gte = new Date(startTime)
      }
      if (endTime) {
        where.timestamp.lte = new Date(endTime)
      }
    }

    // 获取数据总数
    const total = await prisma.deviceData.count({ where })

    // 获取设备数据
    const data = await prisma.deviceData.findMany({
      where,
      include: {
        device: {
          select: {
            name: true,
            type: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    })

    // 获取最新的数据（用于实时显示）
    const latestData = await prisma.deviceData.findMany({
      where: { deviceId: id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      data,
      latestData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取设备数据失败:', error)
    return NextResponse.json(
      { error: '获取设备数据失败' },
      { status: 500 }
    )
  }
}

// POST /api/devices/[id]/data - 创建设备数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { dataType, value, unit } = body

    // 验证必填字段
    if (!dataType || !value) {
      return NextResponse.json(
        { error: '数据类型和值为必填项' },
        { status: 400 }
      )
    }

    // 检查设备是否存在
    const device = await prisma.device.findUnique({
      where: { id },
    })

    if (!device) {
      return NextResponse.json(
        { error: '设备不存在' },
        { status: 404 }
      )
    }

    // 创建数据记录
    const data = await prisma.deviceData.create({
      data: {
        deviceId: id,
        dataType,
        value: value.toString(),
        unit: unit || '',
      },
      include: {
        device: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    return NextResponse.json({
      message: '数据创建成功',
      data,
    })
  } catch (error) {
    console.error('创建设备数据失败:', error)
    return NextResponse.json(
      { error: '创建设备数据失败' },
      { status: 500 }
    )
  }
} 
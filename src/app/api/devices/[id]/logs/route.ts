import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/devices/[id]/logs - 获取设备日志
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const level = searchParams.get('level') || ''
    const source = searchParams.get('source') || ''

    // 构建查询条件
    const where: any = {
      deviceId: id
    }
    
    if (level) {
      where.level = level
    }
    
    if (source) {
      where.source = { contains: source, mode: 'insensitive' }
    }

    // 获取日志总数
    const total = await prisma.deviceLog.count({ where })

    // 获取设备日志
    const logs = await prisma.deviceLog.findMany({
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

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取设备日志失败:', error)
    return NextResponse.json(
      { error: '获取设备日志失败' },
      { status: 500 }
    )
  }
}

// POST /api/devices/[id]/logs - 创建设备日志
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { level, message, source, details } = body

    // 验证必填字段
    if (!level || !message) {
      return NextResponse.json(
        { error: '日志级别和消息为必填项' },
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

    // 创建日志
    const log = await prisma.deviceLog.create({
      data: {
        deviceId: id,
        level,
        message,
        source: source || '',
        details: details || '',
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
      message: '日志创建成功',
      log,
    })
  } catch (error) {
    console.error('创建设备日志失败:', error)
    return NextResponse.json(
      { error: '创建设备日志失败' },
      { status: 500 }
    )
  }
} 
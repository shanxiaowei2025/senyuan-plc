import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: 获取设备列表
 *     description: 分页获取设备列表，支持按名称、型号、位置搜索和类型、状态筛选
 *     tags:
 *       - 设备管理
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词(名称、型号或位置)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 设备类型过滤
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ONLINE, OFFLINE, ERROR, MAINTENANCE]
 *         description: 设备状态过滤
 *     responses:
 *       200:
 *         description: 成功返回设备列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '获取设备列表失败'
 */
// GET /api/devices - 获取设备列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    // 构建查询条件
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.status = status
    }

    // 获取设备总数
    const total = await prisma.device.count({ where })

    // 获取设备列表
    const devices = await prisma.device.findMany({
      where,
      include: {
        deviceLogs: {
          take: 5,
          orderBy: { timestamp: 'desc' }
        },
        deviceData: {
          take: 10,
          orderBy: { timestamp: 'desc' }
        },
        _count: {
          select: {
            deviceLogs: true,
            deviceData: true,
            maintenance: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      devices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取设备列表失败:', error)
    return NextResponse.json(
      { error: '获取设备列表失败' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: 创建新设备
 *     description: 创建一个新设备并返回设备信息
 *     tags:
 *       - 设备管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: 设备名称(唯一)
 *                 example: "PLC控制器01"
 *               type:
 *                 type: string
 *                 description: 设备类型
 *                 example: "Modbus TCP"
 *               model:
 *                 type: string
 *                 description: 设备型号
 *                 example: "S7-1200"
 *               location:
 *                 type: string
 *                 description: 设备位置
 *                 example: "生产线1号控制柜"
 *               status:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, ERROR, MAINTENANCE]
 *                 default: OFFLINE
 *                 description: 设备状态
 *                 example: "OFFLINE"
 *     responses:
 *       200:
 *         description: 设备创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: '设备创建成功'
 *                 device:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         description: 请求参数错误或设备名称已存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '设备名称和类型为必填项'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '创建设备失败'
 */
// POST /api/devices - 创建新设备
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, model, location, status } = body

    // 验证必填字段
    if (!name || !type) {
      return NextResponse.json(
        { error: '设备名称和类型为必填项' },
        { status: 400 }
      )
    }

    // 检查设备名称是否已存在
    const existingDevice = await prisma.device.findFirst({
      where: { name },
    })

    if (existingDevice) {
      return NextResponse.json(
        { error: '设备名称已存在' },
        { status: 400 }
      )
    }

    // 创建设备
    const device = await prisma.device.create({
      data: {
        name,
        type,
        model: model || '',
        location: location || '',
        status: status || 'OFFLINE',
      },
      include: {
        _count: {
          select: {
            deviceLogs: true,
            deviceData: true,
            maintenance: true
          }
        }
      }
    })

    return NextResponse.json({
      message: '设备创建成功',
      device,
    })
  } catch (error) {
    console.error('创建设备失败:', error)
    return NextResponse.json(
      { error: '创建设备失败' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /devices/{id}/data:
 *   get:
 *     summary: 获取设备数据
 *     description: 获取指定设备的数据记录，支持分页和条件筛选
 *     tags:
 *       - 设备数据管理
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: 设备ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         required: false
 *         description: 每页数据量
 *       - in: query
 *         name: dataType
 *         schema:
 *           type: string
 *         required: false
 *         description: 数据类型筛选
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: 起始时间
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: 结束时间
 *     responses:
 *       200:
 *         description: 成功获取设备数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: 数据记录ID
 *                       deviceId:
 *                         type: string
 *                         description: 设备ID
 *                       dataType:
 *                         type: string
 *                         description: 数据类型
 *                         example: "temperature"
 *                       value:
 *                         type: string
 *                         description: 数据值
 *                         example: "25.5"
 *                       unit:
 *                         type: string
 *                         description: 数据单位
 *                         example: "°C"
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: 数据时间戳
 *                       device:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: 设备名称
 *                           type:
 *                             type: string
 *                             description: 设备类型
 *                 latestData:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: 最新的10条数据
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     limit:
 *                       type: integer
 *                       description: 每页数据量
 *                     total:
 *                       type: integer
 *                       description: 总数据量
 *                     pages:
 *                       type: integer
 *                       description: 总页数
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 创建设备数据
 *     description: 为指定设备添加新的数据记录
 *     tags:
 *       - 设备数据管理
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: 设备ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataType:
 *                 type: string
 *                 description: 数据类型
 *                 example: "temperature"
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                 description: 数据值
 *                 example: 25.5
 *               unit:
 *                 type: string
 *                 description: 数据单位
 *                 example: "°C"
 *             required:
 *               - dataType
 *               - value
 *     responses:
 *       200:
 *         description: 成功创建数据记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "数据创建成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 数据记录ID
 *                     deviceId:
 *                       type: string
 *                       description: 设备ID
 *                     dataType:
 *                       type: string
 *                       description: 数据类型
 *                     value:
 *                       type: string
 *                       description: 数据值
 *                     unit:
 *                       type: string
 *                       description: 数据单位
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: 数据时间戳
 *                     device:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: 设备名称
 *                         type:
 *                           type: string
 *                           description: 设备类型
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 设备不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
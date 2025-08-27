import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUTC8TimeString } from '@/lib/utils'

const DATA_FILE = path.join(process.cwd(), 'data/measure-positions.json')

// 确保数据目录存在
function ensureDataDirectory() {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// 读取测量位置数据
function readMeasurePositions() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return []
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取测量位置数据失败:', error)
    return []
  }
}

// 写入测量位置数据
function writeMeasurePositions(data: any[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('写入测量位置数据失败:', error)
    return false
  }
}

/**
 * @swagger
 * /measure-positions:
 *   get:
 *     summary: 获取测量位置参数
 *     description: 获取所有钢筋测量位置的配置参数
 *     tags:
 *       - 测量位置管理
 *     responses:
 *       200:
 *         description: 成功获取测量位置参数
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "position-1"
 *                       name:
 *                         type: string
 *                         example: "钢筋测量位置1"
 *                       value:
 *                         type: number
 *                         example: 100.5
 *                       description:
 *                         type: string
 *                         example: "测量位置1的参数值"
 *                       plcAddress:
 *                         type: string
 *                         example: "D2000"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 保存测量位置参数
 *     description: 批量保存钢筋测量位置的配置参数
 *     tags:
 *       - 测量位置管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               measurePositions:
 *                 type: object
 *                 description: 8个测量位置的参数对象
 *                 additionalProperties:
 *                   type: number
 *                   description: 测量位置的数值参数
 *                 example:
 *                   position1: 100.5
 *                   position2: 200.0
 *                   position3: 150.75
 *                   position4: 300.25
 *                   position5: 250.5
 *                   position6: 180.0
 *                   position7: 220.5
 *                   position8: 275.25
 *             required:
 *               - measurePositions
 *     responses:
 *       200:
 *         description: 成功保存测量位置参数
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "测量位置参数保存成功"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "position-1"
 *                       name:
 *                         type: string
 *                         example: "钢筋测量位置1"
 *                       value:
 *                         type: number
 *                         example: 100.5
 *                       description:
 *                         type: string
 *                         example: "测量位置1的参数值"
 *                       plcAddress:
 *                         type: string
 *                         example: "D2000"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: 请求参数错误
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
// GET - 获取测量位置参数
export async function GET() {
  try {
    const positions = readMeasurePositions()
    return NextResponse.json({ success: true, data: positions })
  } catch (error) {
    console.error('获取测量位置参数失败:', error)
    return NextResponse.json(
      { success: false, error: '获取测量位置参数失败' },
      { status: 500 }
    )
  }
}

// POST - 保存测量位置参数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { measurePositions } = body

    if (!measurePositions || typeof measurePositions !== 'object') {
      return NextResponse.json(
        { success: false, error: '无效的测量位置参数' },
        { status: 400 }
      )
    }
    
    // 将前端的8个位置参数转换为后端文件格式
    const positions = Object.entries(measurePositions).map(([key, value], index) => ({
      id: `position-${index + 1}`,
      name: `钢筋测量位置${index + 1}`,
      value: Number(value),
      description: `测量位置${index + 1}的参数值`,
      plcAddress: `D${2000 + index}`, // D2000, D2001, D2002...
      isActive: true,
      createdAt: getUTC8TimeString(),
      updatedAt: getUTC8TimeString()
    }))

    const success = writeMeasurePositions(positions)
    
    if (success) {
    return NextResponse.json({
      success: true,
        message: '测量位置参数保存成功',
        data: positions 
    })
    } else {
      return NextResponse.json(
        { success: false, error: '保存测量位置参数失败' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('保存测量位置参数失败:', error)
    return NextResponse.json(
      { success: false, error: '保存测量位置参数失败' },
      { status: 500 }
    )
  }
} 
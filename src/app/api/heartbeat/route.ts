import { NextRequest, NextResponse } from 'next/server'
import { startHeartbeat, stopHeartbeat, getHeartbeatStatus } from '@/lib/plc-monitor-service'

/**
 * @swagger
 * /heartbeat:
 *   post:
 *     summary: 控制心跳服务
 *     description: 启动或停止PLC心跳监控服务
 *     tags:
 *       - 心跳监控
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [start, stop]
 *                 description: 操作类型
 *                 example: "start"
 *             required:
 *               - action
 *     responses:
 *       200:
 *         description: 操作成功
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
 *                   example: "心跳服务已启动"
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
 *   get:
 *     summary: 获取心跳服务状态
 *     description: 获取当前PLC心跳监控服务的运行状态
 *     tags:
 *       - 心跳监控
 *     responses:
 *       200:
 *         description: 成功获取心跳状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       description: 心跳服务是否运行中
 *                       example: true
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       description: 服务启动时间
 *                       example: "2023-07-28T08:37:05.000Z"
 *                     lastHeartbeat:
 *                       type: string
 *                       format: date-time
 *                       description: 最后心跳时间
 *                       example: "2023-07-28T09:15:22.000Z"
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        startHeartbeat()
        return NextResponse.json({
          success: true,
          message: '心跳服务已启动'
        })
      
      case 'stop':
        stopHeartbeat()
        return NextResponse.json({
          success: true,
          message: '心跳服务已停止'
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('心跳服务操作失败:', error)
    return NextResponse.json({
      success: false,
      error: '心跳服务操作失败'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const status = getHeartbeatStatus()
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('获取心跳状态失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取心跳状态失败'
    }, { status: 500 })
  }
} 
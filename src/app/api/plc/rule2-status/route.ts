import { NextRequest, NextResponse } from 'next/server'
import { getRule2Status } from '@/lib/plc-monitor-service'

/**
 * @swagger
 * /plc/rule2-status:
 *   get:
 *     summary: 获取规则2状态
 *     description: 获取PLC规则2的运行状态信息
 *     tags:
 *       - PLC监控
 *     responses:
 *       200:
 *         description: 成功获取规则2状态
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
 *                   description: 规则2状态信息
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                       description: 规则2是否运行中
 *                       example: true
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       description: 规则2启动时间
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                       description: 最后更新时间
 *                     processedCount:
 *                       type: integer
 *                       description: 已处理的数据条数
 *                       example: 150
 *                     errorCount:
 *                       type: integer
 *                       description: 错误次数
 *                       example: 2
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const status = getRule2Status()
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('获取规则2状态失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    )
  }
} 
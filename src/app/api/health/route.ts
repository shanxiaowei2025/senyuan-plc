import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUTC8TimeString } from '@/lib/utils'

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 系统健康状态检查
 *     description: 检查系统的健康状态，包括数据库连接
 *     tags:
 *       - 系统管理
 *     responses:
 *       200:
 *         description: 系统健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-07-28T08:37:05.000Z"
 *                 database:
 *                   type: string
 *                   example: "connected"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *       503:
 *         description: 系统不健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-07-28T08:37:05.000Z"
 *                 database:
 *                   type: string
 *                   example: "disconnected"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: getUTC8TimeString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    })
  } catch (error: any) {
    console.error('健康检查失败:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: getUTC8TimeString(),
        database: 'disconnected',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
      },
      { status: 503 }
    )
  }
} 
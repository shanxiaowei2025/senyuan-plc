import { NextRequest, NextResponse } from 'next/server'
import { startHeartbeat, stopHeartbeat, getHeartbeatStatus } from '@/lib/plc-monitor-service'

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
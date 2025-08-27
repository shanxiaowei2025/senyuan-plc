import { NextResponse } from 'next/server'
import { getHeartbeatStatus } from '@/lib/plc-monitor-service'

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
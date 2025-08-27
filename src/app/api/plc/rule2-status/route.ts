import { NextRequest, NextResponse } from 'next/server'
import { getRule2Status } from '@/lib/plc-monitor-service'

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
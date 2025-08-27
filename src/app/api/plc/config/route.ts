import { NextRequest, NextResponse } from 'next/server'
import { plcService, savePLCConfig } from '@/lib/plc-service'

// 获取当前PLC配置
export async function GET() {
  try {
    const config = plcService.getConnectionStatus().config
    
    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error: any) {
    console.error('获取PLC配置错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '获取PLC配置失败' 
    }, { status: 500 })
  }
}

// 更新PLC配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port, unitId, timeout, reconnectInterval, maxReconnectAttempts, measurePositions } = body

    // 验证必要的参数
    if (!host) {
      return NextResponse.json({ success: false, error: 'IP地址不能为空' }, { status: 400 })
    }

    // 验证IP地址格式
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(host)) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入有效的IP地址格式，例如: 192.168.55.199' 
      }, { status: 400 })
    }

    if (!port || port < 1 || port > 65535) {
      return NextResponse.json({ success: false, error: '端口号必须在1-65535之间' }, { status: 400 })
    }

    // 获取当前配置中的测量位置参数作为默认值
    const currentConfig = plcService.getConnectionStatus().config
    const defaultMeasurePositions = currentConfig.measurePositions || {
      position1: 0, position2: 0, position3: 0, position4: 0,
      position5: 0, position6: 0, position7: 0, position8: 0
    }

    // 创建配置对象
    const config = {
      host,
      port: parseInt(port.toString(), 10),
      unitId: unitId ? parseInt(unitId.toString(), 10) : 1,
      timeout: timeout ? parseInt(timeout.toString(), 10) : 5000,
      reconnectInterval: reconnectInterval ? parseInt(reconnectInterval.toString(), 10) : 3000,
      maxReconnectAttempts: maxReconnectAttempts ? parseInt(maxReconnectAttempts.toString(), 10) : 3,
      measurePositions: measurePositions || defaultMeasurePositions
    }

    // 更新配置
    plcService.updateConfig(config)
    
    // 保存到本地存储
    savePLCConfig(config)
    
    return NextResponse.json({
      success: true,
      data: plcService.getConnectionStatus().config
    })
  } catch (error: any) {
    console.error('更新PLC配置错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '更新PLC配置失败' 
    }, { status: 500 })
  }
} 
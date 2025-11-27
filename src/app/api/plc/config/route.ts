import { NextRequest, NextResponse } from 'next/server'
import { plcService, savePLCConfig } from '@/lib/plc-service'

/**
 * @swagger
 * /plc/config:
 *   get:
 *     summary: 获取PLC配置
 *     description: 获取当前PLC连接配置信息
 *     tags:
 *       - PLC配置管理
 *     responses:
 *       200:
 *         description: 成功获取PLC配置
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
 *                     host:
 *                       type: string
 *                       description: PLC主机IP地址
 *                       example: "192.168.6.6"
 *                     port:
 *                       type: integer
 *                       description: PLC端口号
 *                       example: 502
 *                     unitId:
 *                       type: integer
 *                       description: 从站ID
 *                       example: 1
 *                     timeout:
 *                       type: integer
 *                       description: 连接超时时间(毫秒)
 *                       example: 10000
 *                     reconnectInterval:
 *                       type: integer
 *                       description: 重连间隔(毫秒)
 *                       example: 5000
 *                     maxReconnectAttempts:
 *                       type: integer
 *                       description: 最大重连次数
 *                       example: 5
 *                     measurePositions:
 *                       type: object
 *                       description: 测量位置参数
 *                       properties:
 *                         position1:
 *                           type: number
 *                           example: 100.5
 *                         position2:
 *                           type: number
 *                           example: 200.0
 *                         position3:
 *                           type: number
 *                           example: 150.75
 *                         position4:
 *                           type: number
 *                           example: 300.25
 *                         position5:
 *                           type: number
 *                           example: 250.5
 *                         position6:
 *                           type: number
 *                           example: 180.0
 *                         position7:
 *                           type: number
 *                           example: 220.5
 *                         position8:
 *                           type: number
 *                           example: 275.25
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: 更新PLC配置
 *     description: 更新PLC连接配置信息
 *     tags:
 *       - PLC配置管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               host:
 *                 type: string
 *                 description: PLC主机IP地址
 *                 example: "192.168.6.6"
 *               port:
 *                 type: integer
 *                 description: PLC端口号
 *                 minimum: 1
 *                 maximum: 65535
 *                 example: 502
 *               unitId:
 *                 type: integer
 *                 description: 从站ID
 *                 minimum: 1
 *                 maximum: 255
 *                 example: 1
 *               timeout:
 *                 type: integer
 *                 description: 连接超时时间(毫秒)
 *                 minimum: 1000
 *                 example: 10000
 *               reconnectInterval:
 *                 type: integer
 *                 description: 重连间隔(毫秒)
 *                 minimum: 1000
 *                 example: 5000
 *               maxReconnectAttempts:
 *                 type: integer
 *                 description: 最大重连次数
 *                 minimum: 0
 *                 example: 5
 *               measurePositions:
 *                 type: object
 *                 description: 测量位置参数
 *                 properties:
 *                   position1:
 *                     type: number
 *                     description: 测量位置1参数
 *                   position2:
 *                     type: number
 *                     description: 测量位置2参数
 *                   position3:
 *                     type: number
 *                     description: 测量位置3参数
 *                   position4:
 *                     type: number
 *                     description: 测量位置4参数
 *                   position5:
 *                     type: number
 *                     description: 测量位置5参数
 *                   position6:
 *                     type: number
 *                     description: 测量位置6参数
 *                   position7:
 *                     type: number
 *                     description: 测量位置7参数
 *                   position8:
 *                     type: number
 *                     description: 测量位置8参数
 *             required:
 *               - host
 *               - port
 *     responses:
 *       200:
 *         description: 成功更新PLC配置
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
 *                   example: "PLC配置已更新"
 *                 data:
 *                   type: object
 *                   description: 更新后的配置信息
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
        error: '请输入有效的IP地址格式，例如: 192.168.6.6' 
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
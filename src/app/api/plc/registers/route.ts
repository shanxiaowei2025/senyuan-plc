import { NextResponse } from 'next/server'
import { plcClient, checkPLCConnection } from '../connect/route'
import * as plcState from '../plc-state'

/**
 * @swagger
 * /plc/registers:
 *   get:
 *     summary: 读取PLC寄存器
 *     description: 读取指定类型、地址和长度的PLC寄存器值
 *     tags:
 *       - PLC数据交换
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [holding, input, coils]
 *         required: true
 *         description: 寄存器类型(holding=保持寄存器, input=输入寄存器, coils=线圈)
 *       - in: query
 *         name: address
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: true
 *         description: 起始地址
 *       - in: query
 *         name: length
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: 要读取的寄存器数量
 *     responses:
 *       200:
 *         description: 成功读取寄存器值
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
 *                     type:
 *                       type: string
 *                       example: "holding"
 *                     address:
 *                       type: integer
 *                       example: 2000
 *                     length:
 *                       type: integer
 *                       example: 2
 *                     values:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [16968, 16467]
 *       400:
 *         description: 请求参数错误或PLC未连接
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
// 读取寄存器
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'holding', 'input', 'coils'
    const address = searchParams.get('address')
    const length = searchParams.get('length')

    if (!type || !address || !length) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: type, address, length'
      }, { status: 400 })
    }

    // 检查PLC连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }

    const addr = parseInt(address)
    const len = parseInt(length)

    // 添加读取日志
    const log = plcState.addLog('INFO', `读取${type}寄存器 (地址: ${addr}, 长度: ${len})`, 'Read')
    plcState.broadcastLog(log)

    let result: number[] | boolean[]

    try {
    switch (type) {
      case 'holding':
          // 使用plcClient而不是plcService
          const response = await plcClient!.readHoldingRegisters(addr, len)
          result = response.data
        break
      case 'input':
          const inputResponse = await plcClient!.readInputRegisters(addr, len)
          result = inputResponse.data
        break
      case 'coils':
          const coilResponse = await plcClient!.readCoils(addr, len)
          result = coilResponse.data
        break
      default:
        return NextResponse.json({
          success: false,
          error: '无效的寄存器类型'
        }, { status: 400 })
    }

      // 添加成功日志
      const successLog = plcState.addLog('INFO', `读取${type}寄存器成功 (地址: ${addr}, 长度: ${len})`, 'Read')
      plcState.broadcastLog(successLog)

    return NextResponse.json({
      success: true,
      data: {
        type,
        address: addr,
        length: len,
        values: result
      }
    })
  } catch (error) {
      // 读取失败
      const errorMessage = error instanceof Error ? error.message : '读取失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `读取${type}寄存器失败 (地址: ${addr}): ${errorMessage}`, 'Read')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('读取寄存器错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '读取寄存器失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /plc/registers:
 *   post:
 *     summary: 写入PLC寄存器
 *     description: 写入指定类型和地址的PLC寄存器值
 *     tags:
 *       - PLC数据交换
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - address
 *               - value
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [holding, coil]
 *                 description: 寄存器类型(holding=保持寄存器, coil=线圈)
 *                 example: "holding"
 *               address:
 *                 type: integer
 *                 minimum: 0
 *                 description: 寄存器地址
 *                 example: 2000
 *               value:
 *                 oneOf:
 *                   - type: integer
 *                   - type: boolean
 *                 description: 写入的值(对于保持寄存器是整数，对于线圈是布尔值)
 *                 example: 42
 *     responses:
 *       200:
 *         description: 成功写入寄存器值
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
 *                   example: "写入寄存器成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "holding"
 *                     address:
 *                       type: integer
 *                       example: 2000
 *                     value:
 *                       type: integer
 *                       example: 42
 *       400:
 *         description: 请求参数错误或PLC未连接
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
// 写入寄存器
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, address, value } = body

    if (!type || address === undefined || value === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数: type, address, value'
      }, { status: 400 })
    }

    // 检查PLC连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }

    const addr = parseInt(address)

    // 添加写入日志
    const log = plcState.addLog('INFO', `写入${type}寄存器 (地址: ${addr}, 值: ${value})`, 'Write')
    plcState.broadcastLog(log)

    try {
    switch (type) {
      case 'holding':
          // 使用plcClient而不是plcService
          await plcClient!.writeRegisters(addr, [parseInt(value)])
        break
      case 'coil':
          await plcClient!.writeCoil(addr, Boolean(value))
        break
      default:
        return NextResponse.json({
          success: false,
          error: '无效的寄存器类型'
        }, { status: 400 })
    }

      // 添加成功日志
      const successLog = plcState.addLog('INFO', `写入${type}寄存器成功 (地址: ${addr}, 值: ${value})`, 'Write')
      plcState.broadcastLog(successLog)

    return NextResponse.json({
      success: true,
      message: '写入寄存器成功',
      data: {
        type,
        address: addr,
        value
      }
    })
  } catch (error) {
      // 写入失败
      const errorMessage = error instanceof Error ? error.message : '写入失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `写入${type}寄存器失败 (地址: ${addr}, 值: ${value}): ${errorMessage}`, 'Write')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('写入寄存器错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '写入寄存器失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import * as plcState from '../plc-state'
import { plcClient, checkPLCConnection } from '../connect/route'

/**
 * @swagger
 * /plc/coils:
 *   get:
 *     summary: 读取PLC线圈状态
 *     description: 读取指定地址和长度的PLC线圈状态
 *     tags:
 *       - PLC数据交换
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: true
 *         description: 线圈起始地址
 *       - in: query
 *         name: length
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: 要读取的线圈数量
 *       - in: query
 *         name: silent
 *         schema:
 *           type: boolean
 *           default: false
 *         required: false
 *         description: 静默模式，不记录成功日志
 *     responses:
 *       200:
 *         description: 成功读取线圈状态
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
 *                     type: boolean
 *                   example: [true, false, true]
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
// 读取线圈状态
export async function GET(request: Request) {
  try {
    // 从URL获取地址和长度参数
    const url = new URL(request.url)
    const address = parseInt(url.searchParams.get('address') || '0', 10)
    const length = parseInt(url.searchParams.get('length') || '1', 10)
    const silent = url.searchParams.get('silent') === 'true'
    
    // 检查连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }
    
    // 只在非静默模式下添加读取日志
    if (!silent) {
    const log = plcState.addLog('INFO', `读取线圈 (地址: ${address}, 长度: ${length})`, 'Read')
    plcState.broadcastLog(log)
    }
    
    try {
      // 使用ModbusRTU读取线圈
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      const response = await plcClient!.readCoils(address, length)
      
      // 只在非静默模式下添加成功日志
      if (!silent) {
      const successLog = plcState.addLog('INFO', `读取线圈成功 (地址: ${address}, 长度: ${length})`, 'Read')
      plcState.broadcastLog(successLog)
      }
      
      return NextResponse.json({
        success: true,
        data: response.data
      })
    } catch (error) {
      // 读取失败，总是记录错误日志
      const errorMessage = error instanceof Error ? error.message : '读取失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `读取线圈失败 (地址: ${address}): ${errorMessage}`, 'Read')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('读取线圈错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '读取线圈失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /plc/coils:
 *   post:
 *     summary: 写入PLC线圈状态
 *     description: 写入指定地址的PLC线圈状态
 *     tags:
 *       - PLC数据交换
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - value
 *             properties:
 *               address:
 *                 type: integer
 *                 minimum: 0
 *                 description: 线圈地址
 *                 example: 4000
 *               value:
 *                 type: boolean
 *                 description: 要写入的线圈状态(true=ON, false=OFF)
 *                 example: true
 *               silent:
 *                 type: boolean
 *                 description: 静默模式，不记录成功日志
 *                 example: false
 *     responses:
 *       200:
 *         description: 成功写入线圈状态
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
 *                   example: "写入线圈成功"
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
// 写入线圈
export async function POST(request: Request) {
  try {
    // 从请求体中获取地址、值和静默模式参数
    const body = await request.json()
    const { address, value, silent = false } = body
    
    // 验证参数
    if (address === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少地址参数'
      }, { status: 400 })
    }
    
    if (value === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少值参数'
      }, { status: 400 })
    }
    
    const addr = parseInt(address)
    const boolValue = Boolean(value)
    
    // 检查连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }
    
    // 只在非静默模式下添加写入日志
    if (!silent) {
      const log = plcState.addLog('INFO', `写入线圈 (地址: ${addr}, 值: ${boolValue})`, 'Write')
      plcState.broadcastLog(log)
    }
    
    try {
      // 使用ModbusRTU写入线圈
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      await plcClient!.writeCoil(addr, boolValue)
      
      // 只在非静默模式下添加成功日志
      if (!silent) {
        const successLog = plcState.addLog('INFO', `写入线圈成功 (地址: ${addr}, 值: ${boolValue})`, 'Write')
        plcState.broadcastLog(successLog)
      }
      
      return NextResponse.json({
        success: true,
        message: '写入线圈成功'
      })
    } catch (error) {
      // 写入失败
      const errorMessage = error instanceof Error ? error.message : '写入失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `写入线圈失败 (地址: ${addr}, 值: ${boolValue}): ${errorMessage}`, 'Write')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('写入线圈错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '写入线圈失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
} 
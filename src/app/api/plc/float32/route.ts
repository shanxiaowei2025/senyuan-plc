import { NextResponse } from 'next/server'
import * as plcState from '../plc-state'
import { plcClient, checkPLCConnection } from '../connect/route'

/**
 * @swagger
 * /plc/float32:
 *   get:
 *     summary: 读取PLC 32位浮点数
 *     description: 从指定地址读取32位浮点数(占用两个连续的16位寄存器)
 *     tags:
 *       - PLC数据交换
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: true
 *         description: 32位浮点数的起始寄存器地址
 *     responses:
 *       200:
 *         description: 成功读取32位浮点数
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: number
 *                   format: float
 *                   example: 2.5
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
// 读取32位浮点数
export async function GET(request: Request) {
  try {
    // 从URL获取地址参数
    const url = new URL(request.url)
    const address = parseInt(url.searchParams.get('address') || '0', 10)
    
    // 检查连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }
    
    // 添加读取日志
    const log = plcState.addLog('INFO', `读取32位浮点数 (地址: ${address})`, 'Read')
    plcState.broadcastLog(log)
    
    try {
      // 使用modbus-serial读取两个寄存器(32位浮点数)
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      const response = await plcClient!.readHoldingRegisters(address, 2)
      
      // 从两个16位寄存器中提取浮点数
      const buffer = Buffer.alloc(4)
      buffer.writeUInt16LE(response.data[0], 0) // 改为LE：低位寄存器
      buffer.writeUInt16LE(response.data[1], 2) // 改为LE：高位寄存器
      const value = buffer.readFloatLE(0)       // 改为LE
      
      // 添加成功日志
      const successLog = plcState.addLog('INFO', `读取32位浮点数成功 (地址: ${address}, 值: ${value})`, 'Read')
      plcState.broadcastLog(successLog)
      
      return NextResponse.json({
        success: true,
        data: value
      })
    } catch (error) {
      // 读取失败
      const errorMessage = error instanceof Error ? error.message : '读取失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `读取32位浮点数失败 (地址: ${address}): ${errorMessage}`, 'Read')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('读取32位浮点数错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '读取32位浮点数失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /plc/float32:
 *   post:
 *     summary: 写入PLC 32位浮点数
 *     description: 将32位浮点数写入指定地址的PLC寄存器(占用两个连续的16位寄存器)
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
 *                 description: 32位浮点数的起始寄存器地址
 *                 example: 2000
 *               value:
 *                 type: number
 *                 format: float
 *                 description: 要写入的浮点数值
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: 成功写入32位浮点数
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
 *                   example: "写入成功"
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
// 写入32位浮点数
export async function POST(request: Request) {
  try {
    // 从请求体中获取地址和值
    const body = await request.json()
    const { address, value } = body
    
    // 验证参数
    if (address === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少地址参数'
      }, { status: 400 })
    }
    
    if (value === undefined || typeof value !== 'number' || isNaN(value)) {
      return NextResponse.json({
        success: false,
        error: '值必须是有效的数字'
      }, { status: 400 })
    }
    
    // 检查连接状态
    if (!checkPLCConnection()) {
      return NextResponse.json({
        success: false,
        error: 'PLC未连接'
      }, { status: 400 })
    }
    
    // 添加写入日志
    const log = plcState.addLog('INFO', `写入32位浮点数 (地址: ${address}, 值: ${value})`, 'Write')
    plcState.broadcastLog(log)
    
    try {
      // 将浮点数转换为两个16位寄存器值
      const buffer = Buffer.alloc(4)
      buffer.writeFloatLE(value, 0)             // 改为LE
      const lowRegister = buffer.readUInt16LE(0)  // 改为LE：低位寄存器
      const highRegister = buffer.readUInt16LE(2) // 改为LE：高位寄存器
      
      // 使用modbus-serial写入两个寄存器
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      await plcClient!.writeRegisters(address, [lowRegister, highRegister])  // 注意顺序：先低位，后高位
      
      // 添加成功日志
      const successLog = plcState.addLog('INFO', `写入32位浮点数成功 (地址: ${address}, 值: ${value})`, 'Write')
      plcState.broadcastLog(successLog)
      
      return NextResponse.json({
        success: true,
        message: '写入成功'
      })
    } catch (error) {
      // 写入失败
      const errorMessage = error instanceof Error ? error.message : '写入失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `写入32位浮点数失败 (地址: ${address}, 值: ${value}): ${errorMessage}`, 'Write')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('写入32位浮点数错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '写入32位浮点数失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import * as plcState from '../plc-state'
import { plcClient, checkPLCConnection } from '../connect/route'

/**
 * @swagger
 * /plc/float64:
 *   get:
 *     summary: 读取PLC 64位浮点数
 *     description: 从指定地址读取64位浮点数(占用四个连续的16位寄存器)
 *     tags:
 *       - PLC数据交换
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: integer
 *           minimum: 0
 *         required: true
 *         description: 64位浮点数的起始寄存器地址
 *     responses:
 *       200:
 *         description: 成功读取64位浮点数
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
 *                   format: double
 *                   example: 3.141592653589793
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
// 读取64位浮点数
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
    const log = plcState.addLog('INFO', `读取64位浮点数 (地址: ${address})`, 'Read')
    plcState.broadcastLog(log)
    
    try {
      // 使用modbus-serial读取四个寄存器(64位浮点数)
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      const response = await plcClient!.readHoldingRegisters(address, 4)
      
      // 从四个16位寄存器中提取64位浮点数 (信捷PLC字节序)
      // 信捷PLC使用标准Modbus字节序：高字在前，字内为大端序
      const buffer = Buffer.alloc(8)
      // 信捷PLC 64位浮点数排列：寄存器[0][1][2][3] -> 高位->低位
      buffer.writeUInt16BE(response.data[0], 0) // 寄存器1 -> 最高位字
      buffer.writeUInt16BE(response.data[1], 2) // 寄存器2
      buffer.writeUInt16BE(response.data[2], 4) // 寄存器3  
      buffer.writeUInt16BE(response.data[3], 6) // 寄存器4 -> 最低位字
      const value = buffer.readDoubleBE(0)      // 读取64位浮点数(大端序)
      
      // 添加成功日志
      const successLog = plcState.addLog('INFO', `读取64位浮点数成功 (地址: ${address}, 值: ${value})`, 'Read')
      plcState.broadcastLog(successLog)
      
      return NextResponse.json({
        success: true,
        data: value
      })
    } catch (error) {
      // 读取失败
      const errorMessage = error instanceof Error ? error.message : '读取失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `读取64位浮点数失败 (地址: ${address}): ${errorMessage}`, 'Read')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('读取64位浮点数错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '读取64位浮点数失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /plc/float64:
 *   post:
 *     summary: 写入PLC 64位浮点数
 *     description: 将64位浮点数写入指定地址的PLC寄存器(占用四个连续的16位寄存器)
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
 *                 description: 64位浮点数的起始寄存器地址
 *                 example: 2000
 *               value:
 *                 type: number
 *                 format: double
 *                 description: 要写入的双精度浮点数值
 *                 example: 3.141592653589793
 *     responses:
 *       200:
 *         description: 成功写入64位浮点数
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
// 写入64位浮点数
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
    const log = plcState.addLog('INFO', `写入64位浮点数 (地址: ${address}, 值: ${value})`, 'Write')
    plcState.broadcastLog(log)
    
    try {
      // 将64位浮点数转换为四个16位寄存器 (信捷PLC字节序)
      const buffer = Buffer.alloc(8)
      buffer.writeDoubleBE(value, 0)  // 写入64位浮点数(大端序)
      
      // 提取四个16位值 (信捷PLC存储顺序: 高字在前)
      const registers = [
        buffer.readUInt16BE(0), // 寄存器1: 最高位字
        buffer.readUInt16BE(2), // 寄存器2
        buffer.readUInt16BE(4), // 寄存器3
        buffer.readUInt16BE(6)  // 寄存器4: 最低位字
      ]
      
      // 使用modbus-serial写入四个寄存器
      // 添加非空断言，因为已经通过checkPLCConnection()检查
      await plcClient!.writeRegisters(address, registers)
      
      // 添加成功日志
      const successLog = plcState.addLog('INFO', `写入64位浮点数成功 (地址: ${address}, 值: ${value})`, 'Write')
      plcState.broadcastLog(successLog)
      
      return NextResponse.json({
        success: true,
        message: '写入成功'
      })
    } catch (error) {
      // 写入失败
      const errorMessage = error instanceof Error ? error.message : '写入失败'
      
      // 添加错误日志
      const errorLog = plcState.addLog('ERROR', `写入64位浮点数失败 (地址: ${address}, 值: ${value}): ${errorMessage}`, 'Write')
      plcState.broadcastLog(errorLog)
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('写入64位浮点数错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '写入64位浮点数失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
} 
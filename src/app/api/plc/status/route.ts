import { NextResponse } from 'next/server'
import * as plcState from '../plc-state'
import { plcClient, checkPLCConnection } from '../connect/route'

/**
 * @swagger
 * /plc/status:
 *   get:
 *     summary: 获取PLC连接状态
 *     description: 返回当前PLC连接状态，包括连接状态、连接中状态和错误信息
 *     tags:
 *       - PLC监控
 *     responses:
 *       200:
 *         description: 成功返回PLC状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PLCStatus'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 检查PLC连接状态
export async function GET() {
  try {
    // 获取当前连接状态
    const status = plcState.getConnectionStatus()
    
    // 如果有客户端连接，但状态显示未连接，尝试验证连接
    if (plcClient && plcClient.isOpen && !status.isConnected) {
      try {
        // 尝试读取一个寄存器来验证连接是否有效
        await plcClient.readHoldingRegisters(0, 1)
        
        // 如果成功，更新连接状态
        plcState.updateConnectionStatus({
          isConnected: true,
          connectionError: null
        })
        
        // 添加日志
        const log = plcState.addLog('INFO', 'PLC连接状态已验证', 'Status')
        plcState.broadcastLog(log)
      } catch (error) {
        // 连接无效，更新状态
        plcState.updateConnectionStatus({
          isConnected: false,
          connectionError: error instanceof Error ? error.message : '连接无效'
        })
        
        // 添加日志
        const log = plcState.addLog('ERROR', `PLC连接无效: ${error instanceof Error ? error.message : '未知错误'}`, 'Status')
        plcState.broadcastLog(log)
      }
    } else if ((!plcClient || !plcClient.isOpen) && status.isConnected) {
      // 客户端不存在但状态显示已连接，更新状态
      plcState.updateConnectionStatus({
        isConnected: false,
        connectionError: 'PLC连接已丢失'
      })
      
      // 添加日志
      const log = plcState.addLog('ERROR', 'PLC连接已丢失', 'Status')
      plcState.broadcastLog(log)
    }
    
    // 获取最新状态
    const updatedStatus = plcState.getConnectionStatus()
    
    return NextResponse.json({
      success: true,
      data: updatedStatus
    })
  } catch (error) {
    console.error('获取PLC状态错误:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取PLC状态失败'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: plcState.getConnectionStatus()
    }, { status: 500 })
  }
} 
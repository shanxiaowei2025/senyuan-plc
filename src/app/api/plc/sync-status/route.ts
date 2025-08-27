import { NextResponse } from 'next/server';
import * as plcState from '../plc-state';
import { plcClient, checkPLCConnection } from '../connect/route';

/**
 * @swagger
 * /plc/sync-status:
 *   get:
 *     summary: 同步PLC连接状态
 *     description: 强制检查并同步PLC连接状态，确保所有状态一致性
 *     tags:
 *       - PLC连接管理
 *     responses:
 *       200:
 *         description: 成功同步连接状态
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
 *                   example: "连接状态同步完成"
 *                 statusChanged:
 *                   type: boolean
 *                   description: 状态是否发生了变化
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     isConnected:
 *                       type: boolean
 *                       description: PLC是否已连接
 *                       example: true
 *                     isConnecting:
 *                       type: boolean
 *                       description: 是否正在连接中
 *                       example: false
 *                     lastConnectedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 最后连接时间
 *                       nullable: true
 *                     lastDisconnectedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 最后断开时间
 *                       nullable: true
 *                     reconnectAttempts:
 *                       type: integer
 *                       description: 重连尝试次数
 *                       example: 0
 *                     config:
 *                       type: object
 *                       description: PLC配置信息
 *                       properties:
 *                         host:
 *                           type: string
 *                           example: "192.168.55.199"
 *                         port:
 *                           type: integer
 *                           example: 502
 *                         unitId:
 *                           type: integer
 *                           example: 1
 *                         timeout:
 *                           type: integer
 *                           example: 10000
 *                     clientDetails:
 *                       type: object
 *                       nullable: true
 *                       description: 客户端连接详情
 *                       properties:
 *                         isOpen:
 *                           type: boolean
 *                           description: 客户端连接是否打开
 *                           example: true
 *                         isReady:
 *                           type: boolean
 *                           description: 客户端是否准备就绪
 *                           example: true
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: 错误信息
 *                   example: "同步连接状态失败"
 *                 data:
 *                   type: object
 *                   description: 当前PLC连接状态
 */

/**
 * 同步PLC连接状态API
 * 这个API会执行实际的连接检查，并确保所有状态一致
 */
export async function GET() {
  try {
    const statusBefore = { ...plcState.getConnectionStatus() };
    
    // 强制检查PLC连接状态
    const isConnected = checkPLCConnection();
    
    // 如果状态发生变化，记录日志
    if (statusBefore.isConnected !== isConnected) {
      const message = isConnected
        ? '连接状态已同步: PLC已连接'
        : '连接状态已同步: PLC未连接';
      
      const log = plcState.addLog(
        isConnected ? 'INFO' : 'WARNING',
        message,
        'StatusSync'
      );
      plcState.broadcastLog(log);
    }
    
    // 获取最新状态
    const currentStatus = plcState.getConnectionStatus();
    
    // 如果客户端存在，返回额外的连接详情
    let clientDetails = null;
    if (plcClient) {
      clientDetails = {
        isOpen: plcClient.isOpen,
        isReady: Boolean(plcClient.isOpen && !plcState.isConnecting),
      };
    }
    
    return NextResponse.json({
      success: true,
      message: '连接状态同步完成',
      statusChanged: statusBefore.isConnected !== currentStatus.isConnected,
      data: {
        ...currentStatus,
        clientDetails
      }
    });
  } catch (error) {
    console.error('同步连接状态错误:', error);
    
    const errorMessage = error instanceof Error ? error.message : '同步连接状态失败';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: plcState.getConnectionStatus()
    }, { status: 500 });
  }
} 
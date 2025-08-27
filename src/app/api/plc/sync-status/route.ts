import { NextResponse } from 'next/server';
import * as plcState from '../plc-state';
import { plcClient, checkPLCConnection } from '../connect/route';

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
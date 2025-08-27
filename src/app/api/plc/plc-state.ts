import { PLCConfig, PLCLog } from '@/lib/plc-service'
import { getUTC8Date } from '@/lib/utils'

// PLC连接状态
export let isConnected = false
export let isConnecting = false
export let connectionError: string | null = null

// PLC配置
export let plcConfig: PLCConfig = {
  host: process.env.PLC_HOST || '192.168.55.199',
  port: parseInt(process.env.PLC_PORT || '502'),
  unitId: parseInt(process.env.PLC_UNIT_ID || '1'),
  timeout: parseInt(process.env.PLC_TIMEOUT || '15000'), // 增加超时时间到15秒
  reconnectInterval: parseInt(process.env.PLC_RECONNECT_INTERVAL || '8000'), // 增加重连间隔到8秒
  maxReconnectAttempts: 1,
  measurePositions: {
    position1: 0, position2: 0, position3: 0, position4: 0,
    position5: 0, position6: 0, position7: 0, position8: 0
  }
}

// 移除常见的 Modbus PLC 单元ID数组

// PLC日志
export const logs: PLCLog[] = []

// 最大日志数量
const MAX_LOGS = 100

// 添加日志
export function addLog(level: PLCLog['level'], message: string, source: string, details?: string) {
  const log: PLCLog = {
    id: Date.now().toString(),
    timestamp: getUTC8Date(),
    level,
    message,
    source,
    details
  }
  
  // 添加到日志开头
  logs.unshift(log)
  
  // 保持日志数量不超过最大值
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS)
  }
  
  return log
}

// 获取日志
export function getLogs(limit?: number): PLCLog[] {
  return limit ? logs.slice(0, limit) : [...logs]
}

// 清空日志
export function clearLogs(): void {
  logs.splice(0, logs.length)
  addLog('INFO', '日志已清空', 'System')
}

// 更新PLC连接状态
export function updateConnectionStatus(status: {
  isConnected?: boolean
  isConnecting?: boolean
  connectionError?: string | null
}) {
  if (status.isConnected !== undefined) {
    isConnected = status.isConnected
  }
  
  if (status.isConnecting !== undefined) {
    isConnecting = status.isConnecting
  }
  
  if (status.connectionError !== undefined) {
    connectionError = status.connectionError
  }
}

// 更新PLC配置
export function updateConfig(newConfig: Partial<PLCConfig>): void {
  plcConfig = {
    ...plcConfig,
    ...newConfig,
    // 确保maxReconnectAttempts始终为1
    maxReconnectAttempts: 1
  }
}

// 获取PLC连接状态
export function getConnectionStatus() {
  return {
    isConnected,
    isConnecting,
    connectionError,
    // 添加config信息以便前端访问
    config: getConfig()
  }
}

// 获取PLC配置
export function getConfig(): PLCConfig {
  return { ...plcConfig }
}

// WebSocket连接列表
export const wsConnections = new Set<WebSocket>()

// 广播消息到所有WebSocket连接
export function broadcastToWebSockets(message: any) {
  const messageStr = JSON.stringify(message)
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr)
    }
  })
}

// 广播PLC状态到所有WebSocket连接
export function broadcastStatus() {
  broadcastToWebSockets({
    type: 'status',
    data: getConnectionStatus()
  })
}

// 广播日志到所有WebSocket连接
export function broadcastLog(log: PLCLog) {
  broadcastToWebSockets({
    type: 'log',
    data: {
      ...log,
      timestamp: log.timestamp.toISOString()
    }
  })
} 
import { EventEmitter } from 'events'
import { getUTC8Date } from '@/lib/utils'

// 钢筋测量位置参数接口
export interface MeasurePositions {
  position1: number
  position2: number
  position3: number
  position4: number
  position5: number
  position6: number
  position7: number
  position8: number
}

// PLC配置接口
export interface PLCConfig {
  host: string
  port: number
  unitId: number
  timeout: number
  reconnectInterval: number
  maxReconnectAttempts: number // 将被限制为1
  measurePositions: MeasurePositions
}

// PLC日志接口
export interface PLCLog {
  id: string
  timestamp: Date
  level: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  source: string
  details?: string
}

// PLC连接状态接口
export interface PLCConnectionStatus {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  config: PLCConfig
}

/**
 * PLC服务类 - 处理与PLC设备的通信
 * 注意：此版本使用HTTP API与后端通信，不直接连接PLC
 */
export class PLCService extends EventEmitter {
  private config: PLCConfig
  private isConnected: boolean = false
  private isConnecting: boolean = false
  private connectionError: string | null = null
  private logs: PLCLog[] = []
  private maxLogs: number = 100

  constructor(config: PLCConfig) {
    super()
    // 确保maxReconnectAttempts为1，无论传入什么值
    this.config = {
      ...config,
      maxReconnectAttempts: 1
    }
  }

  /**
   * 添加日志
   */
  private addLog(level: PLCLog['level'], message: string, source: string, details?: string) {
    const log: PLCLog = {
      id: Date.now().toString(),
      timestamp: getUTC8Date(),
      level,
      message,
      source,
      details
    }
    
    this.logs.unshift(log) // 添加到日志开头
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs) // 保持日志数量不超过最大值
    }
    
    this.emit('log', log)
  }

  /**
   * 连接到PLC
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return // 已连接，不需要重新连接
    }
    
    if (this.isConnecting) {
      throw new Error('PLC连接正在进行中')
    }
    
    this.isConnecting = true
    this.connectionError = null
    
    try {
      this.addLog('INFO', `开始连接PLC (${this.config.host}:${this.config.port})`, 'Connection')
      
      // 通过API连接PLC
      const response = await fetch('/api/plc/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.config),
        // 增加超时时间以匹配后端
        signal: AbortSignal.timeout(this.config.timeout + 5000) // 给后端处理留出额外时间
      })
      
      const result = await response.json()
      
      if (!result.success) {
        let errorMsg = result.error || '连接失败';
        // 增强错误信息
        if (result.data && result.data.connectionError) {
          errorMsg = result.data.connectionError;
        }
        throw new Error(errorMsg)
      }
      
      // 连接成功
      this.isConnected = true
      this.isConnecting = false
      this.connectionError = null
      this.addLog('INFO', 'PLC连接成功', 'Connection')
      this.emit('connected')
      
    } catch (error) {
      // 连接失败
      this.isConnecting = false
      this.isConnected = false
      
      let errorMessage = '连接失败';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '连接请求超时，请检查网络或PLC设备状态';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = '网络错误，无法发送请求';
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      this.connectionError = errorMessage
      
      this.addLog('ERROR', `PLC连接失败: ${errorMessage}`, 'Connection')
      this.emit('error', error instanceof Error ? error : new Error(errorMessage))
      
      throw error // 重新抛出错误，让调用者处理
    }
  }

  /**
   * 断开PLC连接
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected && !this.isConnecting) {
      return // 已断开，不需要操作
    }
    
    this.addLog('INFO', '断开PLC连接', 'Connection')
    
    try {
      // 通过API断开PLC连接
      const response = await fetch('/api/plc/connect', {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '断开连接失败')
      }
      
      this.isConnected = false
      this.isConnecting = false
      this.emit('disconnected')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `断开PLC连接失败: ${errorMessage}`, 'Connection')
      throw error
    }
  }

  /**
   * 读取保持寄存器
   */
  async readHoldingRegisters(address: number, length: number): Promise<number[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch(`/api/plc/registers/holding?address=${address}&length=${length}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '读取保持寄存器失败')
      }
      
      this.addLog('INFO', `读取保持寄存器: 地址=${address}, 长度=${length}`, 'Read')
      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `读取保持寄存器失败: ${errorMessage}`, 'Read')
      throw error
    }
  }

  /**
   * 写入保持寄存器
   */
  async writeHoldingRegister(address: number, value: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch('/api/plc/registers/holding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address, value })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '写入保持寄存器失败')
      }
      
      this.addLog('INFO', `写入保持寄存器: 地址=${address}, 值=${value}`, 'Write')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `写入保持寄存器失败: ${errorMessage}`, 'Write')
      throw error
    }
  }

  /**
   * 读取输入寄存器
   */
  async readInputRegisters(address: number, length: number): Promise<number[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch(`/api/plc/registers/input?address=${address}&length=${length}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '读取输入寄存器失败')
      }
      
      this.addLog('INFO', `读取输入寄存器: 地址=${address}, 长度=${length}`, 'Read')
      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `读取输入寄存器失败: ${errorMessage}`, 'Read')
      throw error
    }
  }

  /**
   * 读取线圈
   */
  async readCoils(address: number, length: number): Promise<boolean[]> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch(`/api/plc/coils?address=${address}&length=${length}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '读取线圈失败')
      }
      
      this.addLog('INFO', `读取线圈: 地址=${address}, 长度=${length}`, 'Read')
      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `读取线圈失败: ${errorMessage}`, 'Read')
      throw error
    }
  }

  /**
   * 写入线圈
   */
  async writeCoil(address: number, value: boolean): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch('/api/plc/coils', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address, value })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '写入线圈失败')
      }
      
      this.addLog('INFO', `写入线圈: 地址=${address}, 值=${value}`, 'Write')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `写入线圈失败: ${errorMessage}`, 'Write')
      throw error
    }
  }

  /**
   * 读取32位浮点数
   */
  async readFloat32(address: number): Promise<number> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch(`/api/plc/float32?address=${address}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '读取32位浮点数失败')
      }
      
      this.addLog('INFO', `读取32位浮点数: 地址=${address}, 值=${result.data}`, 'Read')
      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `读取32位浮点数失败: ${errorMessage}`, 'Read')
      throw error
    }
  }

  /**
   * 写入32位浮点数
   */
  async writeFloat32(address: number, value: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('PLC未连接')
    }
    
    try {
      const response = await fetch('/api/plc/float32', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address, value })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '写入32位浮点数失败')
      }
      
      this.addLog('INFO', `写入32位浮点数: 地址=${address}, 值=${value}`, 'Write')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addLog('ERROR', `写入32位浮点数失败: ${errorMessage}`, 'Write')
      throw error
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): PLCConnectionStatus {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionError: this.connectionError,
      config: this.config
    }
  }

  /**
   * 获取日志
   */
  getLogs(limit?: number): PLCLog[] {
    return limit ? this.logs.slice(0, limit) : [...this.logs]
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = []
    this.addLog('INFO', '日志已清空', 'System')
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PLCConfig>): void {
    // 如果已连接，不允许更新某些配置
    if (this.isConnected) {
      const safeConfig = { ...newConfig }
      
      // 如果已连接，不允许更改这些配置
      delete safeConfig.host
      delete safeConfig.port
      delete safeConfig.unitId
      
      // 更新安全的配置项
      this.config = {
        ...this.config,
        ...safeConfig,
        // 确保maxReconnectAttempts始终为1
        maxReconnectAttempts: 1
      }
      
      this.addLog('INFO', '已更新PLC配置（部分配置在连接状态下无法更改）', 'Config')
    } else {
      // 未连接状态下可以更新所有配置
      this.config = {
        ...this.config,
        ...newConfig,
        // 确保maxReconnectAttempts始终为1
        maxReconnectAttempts: 1
      }
      
      this.addLog('INFO', '已更新PLC配置', 'Config')
    }
  }
}

// 创建单例实例
export const plcService = new PLCService({
        host: '192.168.6.6',
  port: 502,
  unitId: 1,
  timeout: 5000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 1, // 强制设为1
  measurePositions: {
    position1: 0,
    position2: 0,
    position3: 0,
    position4: 0,
    position5: 0,
    position6: 0,
    position7: 0,
    position8: 0
  }
})

/**
 * 保存PLC配置到本地存储
 */
export function savePLCConfig(config: PLCConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('plcConfig', JSON.stringify({
      ...config,
      maxReconnectAttempts: 1 // 确保maxReconnectAttempts始终为1
    }))
  }
}

/**
 * 从本地存储加载PLC配置
 */
export function loadPLCConfig(): PLCConfig | null {
  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('plcConfig')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        return {
          ...config,
          maxReconnectAttempts: 1, // 确保maxReconnectAttempts始终为1
          measurePositions: config.measurePositions || {
            position1: 0, position2: 0, position3: 0, position4: 0,
            position5: 0, position6: 0, position7: 0, position8: 0
          }
        }
      } catch (e) {
        console.error('解析保存的PLC配置失败', e)
      }
    }
  }
  return null
} 
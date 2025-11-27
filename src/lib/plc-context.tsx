"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { plcService, PLCConfig, PLCLog } from './plc-service'
// 确保事件监听器初始化
import '@/lib/plc-initializer'
// 导入PLC监控服务
import { startMonitoring, stopMonitoring, isMonitoring, handlePLCConnection, isHeartbeatActive } from './plc-monitor-service'

interface PLCContextType {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  
  // 配置相关
  config: PLCConfig
  updateConfig: (newConfig: Partial<PLCConfig>) => void
  
  // 连接控制
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  
  // 日志相关
  logs: PLCLog[]
  refreshLogs: () => Promise<void>
  
  // 寄存器读写
  readFloat32: (address: number) => Promise<number>
  writeFloat32: (address: number, value: number) => Promise<void>
  
  // 加载状态
  isLoading: boolean
  
  // 监控服务
  isMonitoring: boolean
  startMonitoring: () => boolean
  stopMonitoring: () => boolean
  
  // 心跳功能
  isHeartbeatActive: boolean
  
  // 状态刷新
  refreshStatus: () => Promise<void>
}

// 创建上下文
const PLCContext = createContext<PLCContextType | undefined>(undefined)

// 上下文提供者组件
export function PLCProvider({ children }: { children: ReactNode }) {
  // 连接状态
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // 配置
  const [config, setConfig] = useState<PLCConfig>(() => {
    // 尝试从localStorage加载配置
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('plcConfig')
      if (savedConfig) {
        try {
          return JSON.parse(savedConfig)
        } catch (e) {
          console.error('解析保存的PLC配置失败', e)
        }
      }
    }
    
    // 默认配置
    return {
      host: '192.168.6.6',
      port: 502,
      unitId: 1,
      timeout: 15000,
      reconnectInterval: 8000,
      maxReconnectAttempts: 1 // 强制设为1
    }
  })
  
  // 日志
  const [logs, setLogs] = useState<PLCLog[]>([])
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  
  // 监听PLC服务事件
  useEffect(() => {
    // 监听连接状态变化
    const handleConnected = () => {
      console.log('PLC连接成功')
      setIsConnected(true)
      setIsConnecting(false)
      setConnectionError(null)
    }
    
    const handleDisconnected = () => {
      console.log('PLC断开连接')
      setIsConnected(false)
      setIsConnecting(false)
    }
    
    const handleError = (error: Error) => {
      console.error('PLC连接错误', error)
      setConnectionError(error.message)
      setIsConnected(false)
      setIsConnecting(false)
    }
    
    const handleLog = (log: PLCLog) => {
      console.log('新PLC日志', log)
      setLogs(prevLogs => [log, ...prevLogs].slice(0, 100)) // 保留最新的100条日志
    }
    
    // 添加事件监听
    plcService.on('connected', handleConnected)
    plcService.on('disconnected', handleDisconnected)
    plcService.on('error', handleError)
    plcService.on('log', handleLog)
    
    // 初始化状态
    const status = plcService.getConnectionStatus()
    setIsConnected(status.isConnected)
    setIsConnecting(status.isConnecting)
    setConnectionError(status.connectionError)

    // 同步API状态 - 首次加载时同步一次连接状态
    const syncApiStatus = async () => {
      try {
        const response = await fetch('/api/plc/sync-status');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // 如果API状态与当前状态不同，则更新
            if (result.data.isConnected !== status.isConnected) {
              setIsConnected(result.data.isConnected);
              setIsConnecting(result.data.isConnecting);
              setConnectionError(result.data.connectionError);
              console.log('已同步PLC连接状态:', result.data);
            }
          }
        }
      } catch (error) {
        console.error('同步PLC状态失败:', error);
      }
    };
    
    // 执行同步
    syncApiStatus();
    
    // 每5秒自动同步一次状态，确保前后端状态一致
    const syncInterval = setInterval(syncApiStatus, 5000);
    
    // 组件卸载时移除事件监听和清除定时器
    return () => {
      plcService.removeListener('connected', handleConnected)
      plcService.removeListener('disconnected', handleDisconnected)
      plcService.removeListener('error', handleError)
      plcService.removeListener('log', handleLog)
      clearInterval(syncInterval);
    }
  }, [])
  
  // 更新配置
  const updateConfig = (newConfig: Partial<PLCConfig>) => {
    setConfig(prev => {
      const updated = { 
        ...prev, 
        ...newConfig,
        // 确保maxReconnectAttempts始终为1
        maxReconnectAttempts: 1
      }
      
      // 更新服务配置
      plcService.updateConfig(updated)
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('plcConfig', JSON.stringify(updated))
      }
      
      return updated
    })
  }
  
  // 连接PLC
  const connect = async () => {
    try {
      setIsConnecting(true)
      setConnectionError(null)
      setIsLoading(true)
      
      // 更新服务配置
      plcService.updateConfig(config)
      
      // 连接PLC
      await plcService.connect()
      
      // 刷新日志
      await refreshLogs()
    } catch (error) {
      console.error('连接PLC失败', error)
      setConnectionError(error instanceof Error ? error.message : '未知错误')
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  // 断开连接
  const disconnect = async () => {
    try {
      setIsLoading(true)
      await plcService.disconnect()
    } catch (error) {
      console.error('断开PLC连接失败', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  // 刷新日志
  const refreshLogs = async (): Promise<void> => {
    try {
      const logs = plcService.getLogs(50)
      setLogs(logs)
      // 不返回logs，符合Promise<void>类型
    } catch (error) {
      console.error('获取PLC日志失败', error)
      throw error
    }
  }
  
  // 读取32位浮点数
  const readFloat32 = async (address: number): Promise<number> => {
    try {
      setIsLoading(true)
      return await plcService.readFloat32(address)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 写入32位浮点数
  const writeFloat32 = async (address: number, value: number): Promise<void> => {
    try {
      setIsLoading(true)
      await plcService.writeFloat32(address, value)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 监控服务状态
  const [isMonitoringState, setIsMonitoringState] = useState(false)
  
  // M4005心跳状态（读取PLC实际状态）
  const [isHeartbeatActiveState, setIsHeartbeatActiveState] = useState(false)
  
  // 启动监控服务
  const startMonitoringService = () => {
    const result = startMonitoring()
    setIsMonitoringState(isMonitoring())
    return result
  }
  
  // 停止监控服务
  const stopMonitoringService = () => {
    const result = stopMonitoring()
    setIsMonitoringState(isMonitoring())
    return result
  }
  
  // 当连接状态变化时，自动管理监控服务
  useEffect(() => {
    if (isConnected) {
      // 连接成功后自动启动监控
      handlePLCConnection(true)
      setIsMonitoringState(true)
    } else {
      // 断开连接时自动停止监控
      handlePLCConnection(false)
      setIsMonitoringState(false)
      setIsHeartbeatActiveState(false)
    }
  }, [isConnected])
  
  // 定期读取M4005状态
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null
    
    const checkM4005Status = async () => {
      if (!isConnected) {
        setIsHeartbeatActiveState(false)
        return
      }
      
      try {
        const response = await fetch('/api/plc/coils?address=4005&length=1&silent=true')
        if (response.ok) {
          const data = await response.json()
          setIsHeartbeatActiveState(data.success && data.data?.[0] === true)
        } else {
          setIsHeartbeatActiveState(false)
        }
      } catch (error) {
        setIsHeartbeatActiveState(false)
      }
    }
    
    if (isConnected) {
      // 立即检查一次
      checkM4005Status()
      // 每100ms检查一次M4005状态
      heartbeatInterval = setInterval(checkM4005Status, 100)
    }
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
    }
  }, [isConnected])

  // 手动刷新状态
  const refreshStatus = async (): Promise<void> => {
    try {
      const response = await fetch('/api/plc/sync-status');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIsConnected(result.data.isConnected);
          setIsConnecting(result.data.isConnecting);
          setConnectionError(result.data.connectionError);
          console.log('手动刷新PLC连接状态:', result.data);
        }
      }
    } catch (error) {
      console.error('手动刷新PLC状态失败:', error);
    }
  }

  // 提供上下文值
  const contextValue: PLCContextType = {
    isConnected,
    isConnecting,
    connectionError,
    config,
    updateConfig,
    connect,
    disconnect,
    logs,
    refreshLogs,
    readFloat32,
    writeFloat32,
    isLoading,
    isMonitoring: isMonitoringState,
    startMonitoring: startMonitoringService,
    stopMonitoring: stopMonitoringService,
    isHeartbeatActive: isHeartbeatActiveState,
    refreshStatus
  }
  
  return (
    <PLCContext.Provider value={contextValue}>
      {children}
    </PLCContext.Provider>
  )
}

// 自定义钩子，用于访问上下文
export function usePLC() {
  const context = useContext(PLCContext)
  if (context === undefined) {
    throw new Error('usePLC必须在PLCProvider内部使用')
  }
  return context
} 
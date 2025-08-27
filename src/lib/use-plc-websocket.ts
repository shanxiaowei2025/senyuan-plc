import { useEffect, useState, useRef, useCallback } from 'react'
import { PLCLog } from './plc-service'

interface PLCStatus {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
}

interface WebSocketMessage {
  type: 'status' | 'log' | 'logs'
  data: any
}

export function usePLCWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<PLCStatus | null>(null)
  const [logs, setLogs] = useState<PLCLog[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  
  // 连接WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket已连接或正在连接')
      return
    }
    
    try {
      // 创建WebSocket连接
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/plc/ws`
      
      console.log('连接WebSocket:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('WebSocket连接已建立')
        setIsConnected(true)
        
        // 请求最新状态
        ws.send(JSON.stringify({ type: 'getStatus' }))
        
        // 请求最新日志
        ws.send(JSON.stringify({ type: 'getLogs', limit: 50 }))
      }
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'status':
              setStatus(message.data)
              break
            case 'log':
              // 添加单条新日志
              setLogs(prevLogs => {
                const newLog = {
                  ...message.data,
                  timestamp: new Date(message.data.timestamp)
                }
                return [newLog, ...prevLogs].slice(0, 100)
              })
              break
            case 'logs':
              // 更新整个日志列表
              setLogs(message.data.map((log: any) => ({
                ...log,
                timestamp: new Date(log.timestamp)
              })))
              break
            default:
              console.warn('未知的WebSocket消息类型:', message.type)
          }
        } catch (error) {
          console.error('处理WebSocket消息时出错:', error)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket错误:', error)
        setIsConnected(false)
      }
      
      ws.onclose = () => {
        console.log('WebSocket连接已关闭')
        setIsConnected(false)
        wsRef.current = null
        
        // 5秒后尝试重新连接
        setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (error) {
      console.error('创建WebSocket连接时出错:', error)
      setIsConnected(false)
      
      // 5秒后尝试重新连接
      setTimeout(() => {
        connect()
      }, 5000)
    }
  }, [])
  
  // 断开WebSocket连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log('断开WebSocket连接')
      wsRef.current.close()
      wsRef.current = null
      setIsConnected(false)
    }
  }, [])
  
  // 请求最新状态
  const requestStatus = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'getStatus' }))
    }
  }, [])
  
  // 请求最新日志
  const requestLogs = useCallback((limit = 50) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'getLogs', limit }))
    }
  }, [])
  
  // 组件挂载时连接WebSocket，卸载时断开连接
  useEffect(() => {
    // 仅在客户端执行
    if (typeof window !== 'undefined') {
      connect()
      
      return () => {
        disconnect()
      }
    }
  }, [connect, disconnect])
  
  return {
    isConnected,
    status,
    logs,
    connect,
    disconnect,
    requestStatus,
    requestLogs
  }
} 
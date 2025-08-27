"use client"

import { plcService } from './plc-service'

// 在客户端环境中初始化PLC服务事件监听
if (typeof window !== 'undefined') {
  console.log('🔧 正在初始化PLC服务事件监听...')
    
  try {
    // 设置事件监听器
    plcService.on('connected', () => {
      console.log('✅ PLC连接成功')
    })

    plcService.on('disconnected', () => {
      console.log('❌ PLC连接断开')
    })

    plcService.on('error', (error) => {
      console.error('🚨 PLC连接错误:', error.message)
    })

    plcService.on('log', (log) => {
      console.log(`📝 PLC日志 [${log.level}] ${log.message}`)
    })

    console.log('🚀 PLC服务事件监听初始化完成')
  } catch (error) {
    console.error('❌ PLC服务初始化失败:', error)
  }
}

// 导出空对象，以保持 import 的兼容性
export const plcInitializer = {}

// 注意：不再自动连接PLC，让UI组件根据用户操作来控制连接 
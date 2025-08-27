"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, Save, RefreshCw } from "lucide-react"

interface PLCConfig {
  host: string
  port: number
  unitId: number
  timeout: number
  reconnectInterval: number
  maxReconnectAttempts: number
}

export default function SettingsPage() {
  const [config, setConfig] = useState<PLCConfig>({
    host: '',
    port: 502,
    unitId: 1,
    timeout: 5000,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 获取当前配置
  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/plc/config')
      const result = await response.json()
      if (result.success) {
        setConfig(result.data)
      }
    } catch (error) {
      console.error('获取配置失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 保存配置
  const saveConfig = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/plc/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      const result = await response.json()
      if (result.success) {
        alert('配置保存成功！')
      } else {
        alert('配置保存失败：' + result.error)
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      alert('配置保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  // 组件加载时获取配置
  useEffect(() => {
    fetchConfig()
  }, [])

  const handleInputChange = (field: keyof PLCConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 禁用数字输入框的滚轮事件
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).blur()
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
            <p className="text-gray-600">配置PLC连接参数和系统选项</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={fetchConfig}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button 
              onClick={saveConfig}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </div>

        {/* PLC配置卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              PLC连接配置
            </CardTitle>
            <CardDescription>
              配置Modbus TCP连接参数，修改后需要重新连接PLC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PLC IP地址
                  </label>
                  <Input
                    type="text"
                    value={config.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="192.168.55.199"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PLC设备的IP地址
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    端口号
                  </label>
                  <Input
                    type="number"
                    value={config.port}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 502)}
                    onWheel={handleWheel}
                    placeholder="502"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Modbus TCP默认端口为502
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单元ID
                  </label>
                  <Input
                    type="number"
                    value={config.unitId}
                    onChange={(e) => handleInputChange('unitId', parseInt(e.target.value) || 1)}
                    onWheel={handleWheel}
                    placeholder="1"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Modbus设备单元标识符
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    连接超时时间 (毫秒)
                  </label>
                  <Input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 5000)}
                    onWheel={handleWheel}
                    placeholder="5000"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    连接超时时间，建议5000ms
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重连间隔 (毫秒)
                  </label>
                  <Input
                    type="number"
                    value={config.reconnectInterval}
                    onChange={(e) => handleInputChange('reconnectInterval', parseInt(e.target.value) || 3000)}
                    onWheel={handleWheel}
                    placeholder="3000"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    连接断开后重连的间隔时间
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大重连次数
                  </label>
                  <Input
                    type="number"
                    value={config.maxReconnectAttempts}
                    onChange={(e) => handleInputChange('maxReconnectAttempts', parseInt(e.target.value) || 10)}
                    onWheel={handleWheel}
                    placeholder="10"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    连接失败后的最大重连尝试次数
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    配置说明
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>修改配置后需要重新连接PLC才能生效</li>
                      <li>请确保PLC设备支持Modbus TCP协议</li>
                      <li>建议在网络稳定的环境下使用</li>
                      <li>如果连接频繁断开，可以适当增加重连间隔时间</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 
"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, RefreshCw, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"

interface PLCLog {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
  source: string
  details?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<PLCLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<PLCLog[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  // 获取日志数据
  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/plc/logs?limit=100')
      const result = await response.json()
      
      if (result.success) {
        setLogs(result.data)
      } else {
        console.error('获取日志失败:', result.error)
      }
    } catch (error) {
      console.error('获取日志时发生错误:', error)
    } finally {
      setLoading(false)
    }
  }

  // 筛选日志
  useEffect(() => {
    let filtered = logs

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, levelFilter, sourceFilter])

  // 页面加载时获取日志
  useEffect(() => {
    fetchLogs()
    
    // 设置定时刷新（每10秒）
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'INFO':
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  // 获取日志级别样式
  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'destructive'
      case 'WARN':
        return 'secondary'
      case 'INFO':
      default:
        return 'default'
    }
  }

  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 获取唯一的来源列表
  const uniqueSources = Array.from(new Set(logs.map(log => log.source)))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PLC系统日志</h1>
            <p className="text-gray-600">查看PLC通信和规则执行日志</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出日志
            </Button>
          </div>
        </div>

        {/* 筛选器 */}
        <Card>
          <CardHeader>
            <CardTitle>日志筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">日志级别</label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="INFO">信息</SelectItem>
                    <SelectItem value="WARN">警告</SelectItem>
                    <SelectItem value="ERROR">错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">日志来源</label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部来源</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col justify-end">
                <Badge variant="outline" className="w-fit">
                  共 {filteredLogs.length} 条日志
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              日志记录
            </CardTitle>
            <CardDescription>
              实时显示PLC通信、规则执行和系统事件日志
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>加载日志中...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无日志记录</h3>
                <p className="text-gray-600">
                  {logs.length === 0 ? '系统尚未产生任何日志记录' : '当前筛选条件下没有匹配的日志'}
              </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={getLevelBadgeVariant(log.level) as any}>
                          {log.level}
                        </Badge>
                        <Badge variant="outline">
                          {log.source}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 font-medium">
                        {log.message}
                      </p>
                      
                      {log.details && (
                        <p className="text-xs text-gray-600 mt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 规则执行说明 */}
        <Card>
          <CardHeader>
            <CardTitle>规则执行说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>规则1：</strong>当M4000为ON时，读取D2012(钢筋圈半径)和D2016(钢筋直径)，计算最佳测量位置并写入D2000，然后复位M4000。</p>
              <p><strong>日志来源说明：</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Rule Engine：</strong>规则引擎执行日志</li>
                <li><strong>Connection：</strong>PLC连接相关日志</li>
                <li><strong>Read/Write：</strong>PLC数据读写日志</li>
                <li><strong>System：</strong>系统级别日志</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 
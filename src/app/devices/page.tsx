"use client"

import { useState, useEffect, useRef } from "react"
import * as XLSX from 'xlsx'
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePLC } from "@/lib/plc-context"
import { PLCStatusCard } from "@/components/devices/plc-status-card"
import { DeviceLogTab } from "@/components/devices/device-log-tab"
import { DatabaseRecordTable } from "@/components/devices/database-record-table"
import { 
  useFilteredLogs, 
  useFilteredSyPlcRecords, 
  usePaginationData, 
  useConnectionStatus 
} from "@/hooks/use-optimized-plc"
import { 
  Plus, 
  Building, 
  Database, 
  FileText, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  Download,
  Upload,
  Monitor,
  HardDrive,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wrench,
  Calendar,
  BarChart3,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Gauge,
  Server,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Heart
} from "lucide-react"

// 模拟焊笼机设备数据
const weldingMachineData = {
  id: "WM-001",
  name: "焊笼机-01",
  status: "运行中",
  location: "生产车间A区",
  lastMaintenance: "2024-01-10",
  nextMaintenance: "2024-02-10",
  uptime: "168小时",
  temperature: "45°C",
  pressure: "2.5MPa",
  current: "180A",
  voltage: "22V",
  efficiency: "95%",
  totalWorkpieces: 1250,
  todayWorkpieces: 45
}

// 设备接口
interface Device {
  id: string
  name: string
  type: string
  model?: string
  location?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// PLC日志接口
interface PLCLog {
  id: string
  timestamp: string
  level: 'INFO' | 'WARNING' | 'ERROR'
  message: string
  source: string
  details?: string
}

// PLC状态接口
interface PLCStatus {
  isConnected: boolean
  isConnecting: boolean
  reconnectAttempts: number
  maxReconnectAttempts: number
  config: {
    host: string
    port: number
    unitId: number
    timeout: number
    reconnectInterval: number
    maxReconnectAttempts: number
  }
}

// 模拟数据库记录
const databaseRecords = [
  {
    id: 1,
    timestamp: "2024-01-15 14:30:25",
    operation: "INSERT",
    table: "welding_records",
    record_id: "WR-2024-0015",
    description: "新增焊接记录"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:25:18",
    operation: "UPDATE",
    table: "device_status",
    record_id: "DS-001",
    description: "更新设备状态"
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:20:45",
    operation: "INSERT",
    table: "quality_check",
    record_id: "QC-2024-0015",
    description: "质量检测记录"
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:15:32",
    operation: "UPDATE",
    table: "system_logs",
    record_id: "SL-001",
    description: "系统日志更新"
  },
  {
    id: 5,
    timestamp: "2024-01-15 14:10:15",
    operation: "UPDATE",
    table: "welding_params",
    record_id: "WP-001",
    description: "焊接参数调整"
  }
]

// 删除模拟数据库记录，替换为SyPlc数据接口
interface SyPlcRecord {
  id: string
  modelD2040: number
  cageNodesD2044: number
  cageNumD2048: number
  spindleAngleD4012: number
  actualRebarLength: number | null
  theoreticalLength: number
  difference: number | null
  totalNodesD2052: number
  createdAt: string
  updatedAt: string
}

interface DatabaseRecord {
  id: string
  timestamp: string
  operation: string
  table: string
  record_id: string
  description: string
  details?: any
}

export default function DevicesPage() {
  // 使用PLC上下文
  const plcContext = usePLC()
  
  const [activeTab, setActiveTab] = useState<'logs' | 'database' | 'plcio' | 'config'>('logs')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [plcStatus, setPlcStatus] = useState<PLCStatus | null>(null)
  const [logs, setLogs] = useState<PLCLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [logFilter, setLogFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [databaseRecords, setDatabaseRecords] = useState<DatabaseRecord[]>([])
  const [syPlcRecords, setSyPlcRecords] = useState<SyPlcRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const recordsPerPage = 10

  // 添加增删改相关状态
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [advancedSearchFields, setAdvancedSearchFields] = useState({
    modelD2040: '',
    cageNodesD2044: '',
    cageNumD2048: '',
    spindleAngleD4012: '',
    actualRebarLength: '',
    theoreticalLength: '',
    difference: '',
    totalNodesD2052: '',
    createdAtStart: '',
    createdAtEnd: '',
    updatedAtStart: '',
    updatedAtEnd: ''
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SyPlcRecord | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    modelD2040: '',
    cageNodesD2044: '',
    cageNumD2048: '',
    spindleAngleD4012: '',
    actualRebarLength: '',
    theoreticalLength: '',
    difference: '',
    totalNodesD2052: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 日志分页相关状态
  const [currentLogPage, setCurrentLogPage] = useState(1)
  const logsPerPage = 5

  // 分页控制函数
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // 日志分页控制函数
  const goToLogPage = (page: number) => {
    setCurrentLogPage(page)
  }

  const goToPreviousLogPage = () => {
    if (currentLogPage > 1) {
      setCurrentLogPage(currentLogPage - 1)
    }
  }

  const goToNextLogPage = () => {
    if (currentLogPage < totalLogPages) {
      setCurrentLogPage(currentLogPage + 1)
    }
  }

  // 当搜索条件或过滤条件改变时，重置到第一页
  useEffect(() => {
    setCurrentLogPage(1)
  }, [searchTerm, logFilter])

  // 添加一个ref来记录配置是否已经初始化
  const configInitialized = useRef(false)
  // WebSocket连接已不再使用，相关状态和ref可以移除
  // const [wsConnected, setWsConnected] = useState(false)
  // const wsRef = useRef<WebSocket | null>(null)
  // 添加PLC连接相关状态
  const [connectAttempts, setConnectAttempts] = useState(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState<string | null>(null)
  
  // 使用优化的hooks
  const filteredLogs = useFilteredLogs(logs, searchTerm, logFilter)
  const filteredSyPlcRecords = useFilteredSyPlcRecords(syPlcRecords, isAdvancedSearchOpen, advancedSearchFields)
  const connectionStatus = useConnectionStatus(
    plcContext.isConnected,
    plcContext.isConnecting,
    connectionError,
    connectionSuccess
  )
  
  // 日志分页数据
  const logPaginationData = usePaginationData(filteredLogs, currentLogPage, logsPerPage)
  const {
    totalPages: totalLogPages,
    currentItems: currentLogs,
    hasNextPage: hasNextLogPage,
    hasPreviousPage: hasPreviousLogPage
  } = logPaginationData

  // 数据库记录分页数据
  const dbPaginationData = usePaginationData(filteredSyPlcRecords, currentPage, recordsPerPage)
  const {
    totalPages,
    currentItems: currentRecords,
    hasNextPage,
    hasPreviousPage
  } = dbPaginationData
  
  // 添加PLC读写相关状态
  const [floatRegisterAddress, setFloatRegisterAddress] = useState<number | string>(100)
  const [floatRegisterValue, setFloatRegisterValue] = useState<number | null>(null)
  const [floatInputValue, setFloatInputValue] = useState<string>('')
  const [coilAddress, setCoilAddress] = useState<number | string>(0)
  const [coilValue, setCoilValue] = useState<boolean | null>(null)
  const [isReadingFloat, setIsReadingFloat] = useState<boolean>(false)
  const [isWritingFloat, setIsWritingFloat] = useState<boolean>(false)
  const [isReadingCoil, setIsReadingCoil] = useState<boolean>(false)
  const [isWritingCoil, setIsWritingCoil] = useState<boolean>(false)
  const [plcError, setPlcError] = useState<string | null>(null)
  
  // 添加PLC配置相关状态
  const [plcConfig, setPlcConfig] = useState({
            host: '192.168.6.6',
    port: 502,
    unitId: 1,
    timeout: 5000,
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    // 钢筋测量位置参数
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

  const [showConfigAlert, setShowConfigAlert] = useState<boolean>(false)
  const [measurePositionErrors, setMeasurePositionErrors] = useState<Record<string, string>>({})

  // localStorage辅助函数
  const saveMeasurePositions = (positions: Record<string, number>) => {
    try {
      localStorage.setItem('plc_measure_positions', JSON.stringify(positions))
    } catch (error) {
      console.error('保存测量位置参数失败:', error)
    }
  }

  const loadMeasurePositions = () => {
    try {
      const saved = localStorage.getItem('plc_measure_positions')
      return saved ? JSON.parse(saved) : {
        position1: 0, position2: 0, position3: 0, position4: 0,
        position5: 0, position6: 0, position7: 0, position8: 0
      }
    } catch (error) {
      console.error('加载测量位置参数失败:', error)
      return {
        position1: 0, position2: 0, position3: 0, position4: 0,
        position5: 0, position6: 0, position7: 0, position8: 0
      }
    }
  }

  // 验证测量位置参数
  const validateMeasurePositions = (positions: Record<string, number>) => {
    const errors: Record<string, string> = {}
    Object.keys(positions).forEach(key => {
      const value = positions[key]
      if (value === null || value === undefined || isNaN(value)) {
        errors[key] = '此参数不能为空，可输入负数和小数'
      }
      // 检查是否为有效数字（包括负数和小数）
      else if (!Number.isFinite(value)) {
        errors[key] = '请输入有效的数字（可为负数或小数）'
      }
    })
    setMeasurePositionErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 处理测量位置参数变化
  const handleMeasurePositionChange = (position: string, value: number) => {
    const newPositions = {
      ...plcConfig.measurePositions,
      [position]: value
    }
    
    setPlcConfig(prev => ({
      ...prev,
      measurePositions: newPositions
    }))
    
    // 保存到localStorage
    saveMeasurePositions(newPositions)
    
    // 清除该字段的错误
    if (measurePositionErrors[position]) {
      setMeasurePositionErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[position]
        return newErrors
      })
    }
  }

  // 处理输入框文本变化（不立即转换为数字）
  const handleMeasurePositionInputChange = (position: string, inputValue: string) => {
    // 直接更新显示值，不进行数字转换
    setPlcConfig(prev => ({
      ...prev,
      measurePositions: {
        ...prev.measurePositions,
        [position]: inputValue as any // 临时存储字符串
      }
    }))
    
    // 清除该字段的错误
    if (measurePositionErrors[position]) {
      setMeasurePositionErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[position]
        return newErrors
      })
    }
  }

  // 处理输入框失去焦点，转换为数字并保存
  const handleMeasurePositionBlur = (position: string) => {
    const currentValue = plcConfig.measurePositions[position as keyof typeof plcConfig.measurePositions]
    const stringValue = String(currentValue)
    
    if (stringValue === '' || stringValue.trim() === '') {
      // 如果为空，设置为0
      handleMeasurePositionChange(position, 0)
    } else {
      const numValue = parseFloat(stringValue)
      if (!isNaN(numValue)) {
        handleMeasurePositionChange(position, numValue)
      } else {
        // 如果不是有效数字，恢复为0
        handleMeasurePositionChange(position, 0)
      }
    }
  }

  // 处理浮点寄存器地址输入
  const handleFloatAddressInputChange = (value: string) => {
    setFloatRegisterAddress(value)
  }

  const handleFloatAddressBlur = () => {
    const stringValue = String(floatRegisterAddress)
    if (stringValue === '' || stringValue.trim() === '') {
      setFloatRegisterAddress(100) // 默认值
    } else {
      const numValue = parseInt(stringValue)
      if (!isNaN(numValue) && numValue >= 0) {
        setFloatRegisterAddress(numValue)
      } else {
        setFloatRegisterAddress(100) // 恢复默认值
      }
    }
  }

  // 处理线圈地址输入
  const handleCoilAddressInputChange = (value: string) => {
    setCoilAddress(value)
  }

  const handleCoilAddressBlur = () => {
    const stringValue = String(coilAddress)
    if (stringValue === '' || stringValue.trim() === '') {
      setCoilAddress(0) // 默认值
    } else {
      const numValue = parseInt(stringValue)
      if (!isNaN(numValue) && numValue >= 0) {
        setCoilAddress(numValue)
      } else {
        setCoilAddress(0) // 恢复默认值
      }
    }
  }

  // 禁用数字输入框的滚轮事件
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).blur()
  }

  // 处理高级搜索字段变化
  const handleAdvancedSearchChange = (field: string, value: string) => {
    setAdvancedSearchFields(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 执行高级搜索
  const performAdvancedSearch = () => {
    if (isAdvancedSearchOpen) {
      // 构建API搜索参数
      const apiSearchParams: Record<string, string> = {}
      
      // 映射前端字段到API参数
      if (advancedSearchFields.modelD2040) apiSearchParams.model = advancedSearchFields.modelD2040
      if (advancedSearchFields.cageNodesD2044) apiSearchParams.cageNodes = advancedSearchFields.cageNodesD2044
      if (advancedSearchFields.cageNumD2048) apiSearchParams.cageNum = advancedSearchFields.cageNumD2048
      if (advancedSearchFields.spindleAngleD4012) apiSearchParams.angle = advancedSearchFields.spindleAngleD4012
      if (advancedSearchFields.actualRebarLength) apiSearchParams.actualRebarLength = advancedSearchFields.actualRebarLength
      if (advancedSearchFields.theoreticalLength) apiSearchParams.theoreticalLength = advancedSearchFields.theoreticalLength
      if (advancedSearchFields.difference) apiSearchParams.difference = advancedSearchFields.difference
      if (advancedSearchFields.totalNodesD2052) apiSearchParams.totalNodes = advancedSearchFields.totalNodesD2052
      if (advancedSearchFields.createdAtStart) apiSearchParams.createdAtStart = advancedSearchFields.createdAtStart
      if (advancedSearchFields.createdAtEnd) apiSearchParams.createdAtEnd = advancedSearchFields.createdAtEnd
      if (advancedSearchFields.updatedAtStart) apiSearchParams.updatedAtStart = advancedSearchFields.updatedAtStart
      if (advancedSearchFields.updatedAtEnd) apiSearchParams.updatedAtEnd = advancedSearchFields.updatedAtEnd

      fetchDatabaseRecords(apiSearchParams)
    } else {
      fetchDatabaseRecords()
    }
  }

  // 清空高级搜索
  const clearAdvancedSearch = () => {
    setAdvancedSearchFields({
      modelD2040: '',
      cageNodesD2044: '',
      cageNumD2048: '',
      spindleAngleD4012: '',
      actualRebarLength: '',
      theoreticalLength: '',
      difference: '',
      totalNodesD2052: '',
      createdAtStart: '',
      createdAtEnd: '',
      updatedAtStart: '',
      updatedAtEnd: ''
    })
  }

  // 切换搜索模式
  const toggleSearchMode = () => {
    setIsAdvancedSearchOpen(!isAdvancedSearchOpen)
    if (isAdvancedSearchOpen) {
      clearAdvancedSearch() // 收起搜索时清空高级搜索
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-200'
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'INFO': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT': return 'text-green-600 bg-green-50 border-green-200'
      case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'DELETE': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '运行中': return 'text-green-600 bg-green-50 border-green-200'
      case '已停止': return 'text-red-600 bg-red-50 border-red-200'
      case '维护中': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // 获取PLC状态
  const fetchPLCStatus = async () => {
    try {
      const response = await fetch('/api/plc/status')
      const result = await response.json()
      if (result.success) {
        setPlcStatus(result.data)
        
        // 根据后端返回的连接状态同步前端显示状态
        if (result.data.isConnected) {
          // 如果后端已连接但前端显示错误或未连接，更新为成功状态
          if (connectionError) {
            setConnectionError(null)
          }
          if (!connectionSuccess) {
            setConnectionSuccess('PLC连接成功')
          }
        } else {
          // 如果后端未连接但前端显示成功，清除成功状态
          if (connectionSuccess) {
            setConnectionSuccess(null)
          }
        }
      }
    } catch (error) {
      console.error('获取PLC状态失败:', error)
    }
  }

  // 获取PLC日志
  const fetchPLCLogs = async () => {
    try {
      // 如果PLC未连接，使用当前的配置信息尝试获取日志
      if (!plcStatus?.isConnected) {
        // 添加一条本地日志，表明PLC未连接
        const disconnectedLog: PLCLog = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('zh-CN'),
          level: 'WARNING',
          message: 'PLC未连接',
          source: 'System',
          details: '请前往PLC配置标签页连接PLC'
        }
        
        // 获取之前的日志，如果有的话
        const existingLogs = [...logs]
        
        // 检查是否已经有类似的未连接提示日志
        const hasDisconnectedLog = existingLogs.some(log => 
          log.level === 'WARNING' && log.message === 'PLC未连接'
        )
        
        // 如果没有类似日志，添加到日志列表顶部
        if (!hasDisconnectedLog) {
          setLogs([disconnectedLog, ...existingLogs])
        }
        
        return
      }
      
      const response = await fetch('/api/plc/logs?limit=50')
      const result = await response.json()
      if (result.success) {
        const formattedLogs = result.data.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp).toLocaleString('zh-CN')
        }))
        setLogs(formattedLogs)
      }
    } catch (error) {
      console.error('获取PLC日志失败:', error)
      
      // 如果获取失败，添加一条错误日志
      const errorLog: PLCLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('zh-CN'),
        level: 'ERROR',
        message: '获取PLC日志失败',
        source: 'System',
        details: error instanceof Error ? error.message : '未知错误'
      }
      
      setLogs(prevLogs => [errorLog, ...prevLogs])
    }
  }

  // 连接PLC
  const connectPLC = async () => {
    setIsLoading(true)
    setConnectionError(null)
    setConnectionSuccess(null)
    
    // 验证IP地址格式
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(plcConfig.host)) {
              setConnectionError('请输入有效的IP地址格式，例如: 192.168.6.6');
      setIsLoading(false);
      return;
    }
    
    // 标记配置已初始化
    configInitialized.current = true
    
    const tryConnect = async () => {
      try {
        console.log('尝试连接PLC:', plcConfig)
        const response = await fetch('/api/plc/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(plcConfig) // 使用当前配置信息进行连接
        })
        
        // 先检查HTTP响应状态
        if (!response.ok) {
          const errorText = await response.text()
          console.error('HTTP错误:', response.status, errorText)
          return {
            success: false,
            errorMessage: `HTTP错误 ${response.status}: ${errorText}`
          }
        }
        
        const result = await response.json()
        console.log('连接PLC响应:', result)
        
        if (result.success) {
          // 连接成功
          setConnectionSuccess('PLC连接成功')
          setConnectAttempts(0) // 重置尝试次数
          
          // 连接成功后立即刷新状态和日志
          await fetchPLCStatus()
          await fetchPLCLogs()
          
          // 同时刷新PLC上下文状态
          await plcContext.refreshStatus()
          
          // 建立WebSocket连接监控PLC日志
          // connectWebSocket() // 移除此行，不再使用WebSocket
          return { success: true }
        } else {
          // 连接失败，API返回错误
          return {
            success: false,
            errorMessage: result.error || '连接失败，服务器返回错误'
          }
        }
      } catch (error) {
        console.error('连接PLC失败:', error)
        
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        
        // 添加一条错误日志
        const errorLog: PLCLog = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('zh-CN'),
          level: 'ERROR',
          message: '连接PLC失败',
          source: 'System',
          details: errorMessage
        }
        setLogs(prevLogs => [errorLog, ...prevLogs])
        
        return {
          success: false,
          errorMessage: `连接失败: ${errorMessage}`
        }
      }
    }
    
    // 第一次尝试连接
    const firstAttempt = await tryConnect()
    
    if (!firstAttempt.success) {
      setConnectAttempts(1)
      setConnectionError(`${firstAttempt.errorMessage}，正在重试...`)
      
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 第二次尝试连接
      const secondAttempt = await tryConnect()
      
      if (!secondAttempt.success) {
        const errorMsg = secondAttempt.errorMessage || firstAttempt.errorMessage
        // 显示具体的连接错误信息
        let friendlyErrorMsg = errorMsg
        
        // 根据常见错误提供友好的提示
        if (errorMsg.includes('ECONNREFUSED')) {
          friendlyErrorMsg = `连接被拒绝 (${plcConfig.host}:${plcConfig.port})，请检查PLC设备是否已开启或IP地址/端口是否正确`
        } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout') || errorMsg.includes('超时')) {
          friendlyErrorMsg = `连接超时 (${plcConfig.host}:${plcConfig.port})，请检查网络连接或PLC设备是否可达`
        }
        
        setConnectionError(friendlyErrorMsg)
      }
    }
    
    // 无论成功或失败，最终都重置加载状态和尝试次数，允许用户重新连接
    setIsLoading(false)
    setConnectAttempts(0)
    
    // 刷新PLC状态以获取最新状态
    await fetchPLCStatus()
  }

  // 连接到WebSocket以监控PLC日志 - 不再使用，改为轮询机制
  /*
  const connectWebSocket = () => {
    // 如果WebSocket已经连接，先关闭
    closeWebSocket();
    
    try {
    // 创建WebSocket连接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/plc/ws`;
    
    console.log('尝试连接WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      setWsConnected(true);
        
        // 发送获取状态请求
        try {
          ws.send(JSON.stringify({ type: 'getStatus' }));
          ws.send(JSON.stringify({ type: 'getLogs', limit: 50 }));
        } catch (err) {
          console.error('发送WebSocket消息失败:', err);
        }
    };
    
    ws.onmessage = (event) => {
      try {
          // 解析接收到的消息
          const data = JSON.parse(event.data);
          console.log('收到WebSocket消息:', data);
          
          // 处理不同类型的消息
          if (data.type === 'status') {
            // 更新PLC状态
            setPlcStatus(data.data);
          } else if (data.type === 'log') {
            // 添加新日志
            const newLog = {
              ...data.data,
              timestamp: new Date(data.data.timestamp).toLocaleString('zh-CN')
            };
            setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100));
          } else if (data.type === 'logs') {
            // 更新日志列表
            const formattedLogs = data.data.map((log: any) => ({
              ...log,
              timestamp: new Date(log.timestamp).toLocaleString('zh-CN')
            }));
            setLogs(formattedLogs);
          } else if (data.type === 'error') {
            console.error('WebSocket错误消息:', data.error);
          }
      } catch (error) {
        console.error('处理WebSocket消息时出错:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setWsConnected(false);
    };
    
      ws.onclose = (event) => {
        console.log('WebSocket连接已关闭, code:', event.code, '原因:', event.reason);
      setWsConnected(false);
      wsRef.current = null;
    };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setWsConnected(false);
    }
  };
  
  // 关闭WebSocket连接 - 不再使用，改为轮询机制
  const closeWebSocket = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('关闭WebSocket连接');
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
    }
  };
  */

  // 断开PLC连接
  const disconnectPLC = async () => {
    setIsLoading(true)
    setConnectionError(null)
    setConnectionSuccess(null)
    
    // 不再需要断开WebSocket
    // closeWebSocket()
    
    try {
      const response = await fetch('/api/plc/connect', {
        method: 'DELETE'
      })
      const result = await response.json()
      if (result.success) {
        // 断开连接成功
        setConnectionSuccess('已断开PLC连接')
        
        // 断开连接成功后立即刷新状态和日志
        await fetchPLCStatus()
        await fetchPLCLogs()
      } else {
        const errorMsg = result.error || '断开连接失败，服务器返回错误'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('断开PLC连接失败:', error)
      
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      // 根据常见错误提供友好的提示
      let friendlyErrorMsg = `断开PLC连接失败: ${errorMessage}`
      if (errorMessage.includes('ECONNREFUSED')) {
        friendlyErrorMsg = `断开连接失败: 连接已中断或PLC设备不可达 (${plcConfig.host}:${plcConfig.port})`
      }
      
      setConnectionError(friendlyErrorMsg)
      
      // 添加一条错误日志
      const errorLog: PLCLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('zh-CN'),
        level: 'ERROR',
        message: '断开PLC连接失败',
        source: 'System',
        details: errorMessage
      }
      setLogs(prevLogs => [errorLog, ...prevLogs])
    } finally {
      setIsLoading(false)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchPLCStatus(), fetchPLCLogs()])
    } finally {
      setIsLoading(false)
    }
  }

  // 读取32位浮点数寄存器
  const readFloatRegister = async () => {
    if (!plcStatus?.isConnected) {
      setPlcError('PLC未连接，需要先连接PLC才能进行操作')
      return
    }
    
    // 确保地址是数字类型
    const address = typeof floatRegisterAddress === 'string' ? 
      parseInt(floatRegisterAddress) || 100 : floatRegisterAddress
    
    setIsReadingFloat(true)
    setPlcError(null)
    
    try {
      const response = await fetch(`/api/plc/float32?address=${address}`)
      const result = await response.json()
      
      if (result.success) {
        // API直接返回值，而不是嵌套的对象
        setFloatRegisterValue(result.data)
        console.log(`读取到浮点数值: ${result.data}`)
      } else {
        setPlcError(result.error || '读取失败')
      }
    } catch (error) {
      console.error('读取浮点寄存器失败:', error)
      setPlcError('读取失败，请查看控制台')
    } finally {
      setIsReadingFloat(false)
    }
  }
  
  // 写入32位浮点数寄存器
  const writeFloatRegister = async () => {
    if (!plcStatus?.isConnected) {
      setPlcError('PLC未连接，需要先连接PLC才能进行操作')
      return
    }
    
    const value = parseFloat(floatInputValue)
    if (isNaN(value)) {
      setPlcError('请输入有效的浮点数')
      return
    }
    
    // 确保地址是数字类型
    const address = typeof floatRegisterAddress === 'string' ? 
      parseInt(floatRegisterAddress) || 100 : floatRegisterAddress
    
    setIsWritingFloat(true)
    setPlcError(null)
    
    try {
      const response = await fetch('/api/plc/float32', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          value: value
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFloatRegisterValue(value)
        setFloatInputValue('')
      } else {
        setPlcError(result.error || '写入失败')
      }
    } catch (error) {
      console.error('写入浮点寄存器失败:', error)
      setPlcError('写入失败，请查看控制台')
    } finally {
      setIsWritingFloat(false)
    }
  }
  
  // 读取线圈状态
  const readCoil = async () => {
    if (!plcStatus?.isConnected) {
      setPlcError('PLC未连接，需要先连接PLC才能进行操作')
      return
    }
    
    // 确保地址是数字类型
    const address = typeof coilAddress === 'string' ? 
      parseInt(coilAddress) || 0 : coilAddress
    
    setIsReadingCoil(true)
    setPlcError(null)
    
    try {
      const response = await fetch(`/api/plc/coils?address=${address}`)
      const result = await response.json()
      
      if (result.success) {
        setCoilValue(result.data[0]) // 获取第一个线圈的值
      } else {
        setPlcError(result.error || '读取失败')
      }
    } catch (error) {
      console.error('读取线圈失败:', error)
      setPlcError('读取线圈失败，请查看控制台')
    } finally {
      setIsReadingCoil(false)
    }
  }
  
  // 写入线圈状态
  const writeCoil = async (value: boolean) => {
    if (!plcStatus?.isConnected) {
      setPlcError('PLC未连接，需要先连接PLC才能进行操作')
      return
    }
    
    // 确保地址是数字类型
    const address = typeof coilAddress === 'string' ? 
      parseInt(coilAddress) || 0 : coilAddress
    
    setIsWritingCoil(true)
    setPlcError(null)
    
    try {
      const response = await fetch('/api/plc/coils', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          value: value
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCoilValue(value)
      } else {
        setPlcError(result.error || '写入失败')
      }
    } catch (error) {
      console.error('写入线圈失败:', error)
      setPlcError('写入线圈失败，请查看控制台')
    } finally {
      setIsWritingCoil(false)
    }
  }

  // 重置PLC配置为当前状态
  const resetConfig = () => {
    const savedPositions = loadMeasurePositions()
    
    // 添加空值检查
    if (plcStatus && plcStatus.config && plcStatus.config.host !== undefined) {
      setPlcConfig({
                  host: plcStatus.config.host || '192.168.6.6',
        port: plcStatus.config.port || 502,
        unitId: plcStatus.config.unitId || 1,
        timeout: plcStatus.config.timeout || 5000,
        reconnectInterval: plcStatus.config.reconnectInterval || 3000,
        maxReconnectAttempts: plcStatus.config.maxReconnectAttempts || 3,
        measurePositions: savedPositions
      })
    } else {
      // 如果plcStatus未初始化，使用默认值
      setPlcConfig({
        host: '192.168.6.6',
        port: 502,
        unitId: 1,
        timeout: 5000,
        reconnectInterval: 3000,
        maxReconnectAttempts: 3,
        measurePositions: savedPositions
      })
    }
    setPlcError(null)
    
    // 同步一次PLC状态，确保获取最新数据
    fetchPLCStatus()
  }

  // 当用户修改配置时清除连接状态信息
  const handleConfigChange = (key: string, value: any) => {
    // 清除连接状态信息
    setConnectionError(null)
    setConnectionSuccess(null)
    
    // 更新配置
    setPlcConfig(prev => ({
      ...prev,
      [key]: value
    }))
    
    // 标记配置已经初始化
    configInitialized.current = true
  }

  // 当切换标签页时清除连接状态信息
  useEffect(() => {
    setConnectionError(null)
    setConnectionSuccess(null)
  }, [activeTab])

  // 组件加载时初始化配置（只在组件首次加载时执行一次）
  useEffect(() => {
    if (plcStatus?.config && !configInitialized.current) {
      const savedPositions = loadMeasurePositions()
      setPlcConfig({
        host: plcStatus.config.host,
        port: plcStatus.config.port,
        unitId: plcStatus.config.unitId,
        timeout: plcStatus.config.timeout,
        reconnectInterval: plcStatus.config.reconnectInterval,
        maxReconnectAttempts: plcStatus.config.maxReconnectAttempts,
        measurePositions: savedPositions
      })
      // 标记配置已经初始化
      configInitialized.current = true
    }
  }, [plcStatus])

  // 组件加载时从localStorage加载测量位置参数
  useEffect(() => {
    const savedPositions = loadMeasurePositions()
    setPlcConfig(prev => ({
      ...prev,
      measurePositions: savedPositions
    }))
  }, [])

  // 组件加载时获取数据
  useEffect(() => {
    // 并行获取初始数据
    Promise.all([
      fetchPLCStatus(),
      fetchPLCLogs()
    ]).catch(error => console.error('初始化数据失败:', error));
    
    // 定时刷新状态，但在配置页面时暂停刷新
    const interval = setInterval(() => {
      // 只有当不在配置页面时才自动刷新，避免干扰用户输入
      if (activeTab !== 'config') {
        // 并行执行状态和日志刷新
        if (plcStatus?.isConnected) {
          Promise.all([
            fetchPLCStatus(),
            fetchPLCLogs()
          ]).catch(error => console.error('刷新数据失败:', error));
        } else {
          fetchPLCStatus();
        }
      }
    }, 3000) // 降低到3秒刷新一次，提高实时性
    
    return () => clearInterval(interval)
  }, [plcStatus?.isConnected, activeTab])

  // 检查是否需要显示配置提醒
  useEffect(() => {
    if (plcStatus && plcStatus.config && (!plcStatus.config.host || plcStatus.config.host === '')) {
      setShowConfigAlert(true)
      // 移除自动切换到配置标签页的代码
      // setActiveTab('config')  // 自动切换到配置标签页
    } else {
      setShowConfigAlert(false)
    }
  }, [plcStatus])

  // 获取SyPlc数据库记录
  const fetchDatabaseRecords = async (searchParams?: Record<string, string>) => {
    if (!selectedDevice) return
    
    setIsLoadingRecords(true)
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams()
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value && value.trim()) {
            queryParams.append(key, value.trim())
          }
        })
      }
      
      const url = `/api/sy-plc${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success && data.data) {
        // 直接使用SyPlc原始数据
        setSyPlcRecords(data.data)
        // 重置分页到第一页
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('获取数据库记录失败:', error)
      setSyPlcRecords([])
    } finally {
      setIsLoadingRecords(false)
    }
  }

  // 设置默认选中设备
  useEffect(() => {
    if (!selectedDevice) {
      setSelectedDevice({
        id: "WM-001",
        name: "焊笼机-01",
        type: "焊接设备",
        model: "WM-2024",
        location: "生产车间A区",
        status: "ONLINE",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }, [selectedDevice])

  // 当切换到数据库记录标签时获取数据
  useEffect(() => {
    if (activeTab === 'database' && selectedDevice) {
      fetchDatabaseRecords()
    }
  }, [activeTab, selectedDevice])

  // 自动搜索功能：当高级搜索字段变化时，延迟执行搜索
  useEffect(() => {
    if (!isAdvancedSearchOpen || activeTab !== 'database') return

    const hasSearchTerms = Object.values(advancedSearchFields).some(value => value.trim() !== '')
    if (!hasSearchTerms) {
      fetchDatabaseRecords() // 如果没有搜索条件，获取所有数据
      return
    }

    const timeoutId = setTimeout(() => {
      performAdvancedSearch()
    }, 800) // 800ms 延迟，避免频繁请求

    return () => clearTimeout(timeoutId)
  }, [advancedSearchFields, isAdvancedSearchOpen, activeTab])

  // 过滤数据记录逻辑已移至优化的hooks中

  // 验证表单数据
  const validateForm = (data: typeof formData) => {
    const errors: Record<string, string> = {}
    
    // 必填字段：型号、笼子节数、笼子编号、主轴角度、理论长度、总节数
    if (!data.modelD2040 || isNaN(parseFloat(data.modelD2040))) {
      errors.modelD2040 = '请输入有效的型号数值'
    }
    if (!data.cageNodesD2044 || isNaN(parseFloat(data.cageNodesD2044))) {
      errors.cageNodesD2044 = '请输入有效的笼子节数'
    }
    if (!data.cageNumD2048 || isNaN(parseFloat(data.cageNumD2048))) {
      errors.cageNumD2048 = '请输入有效的笼子编号'
    }
    if (!data.spindleAngleD4012 || isNaN(parseFloat(data.spindleAngleD4012))) {
      errors.spindleAngleD4012 = '请输入有效的主轴角度'
    }
    if (!data.theoreticalLength || isNaN(parseFloat(data.theoreticalLength))) {
      errors.theoreticalLength = '请输入有效的理论长度'
    }
    if (!data.totalNodesD2052 || isNaN(parseFloat(data.totalNodesD2052))) {
      errors.totalNodesD2052 = '请输入有效的总节数'
    }
    
    // 可选字段：实际钢筋长度、差值（如果填写了必须是有效数值）
    if (data.actualRebarLength && isNaN(parseFloat(data.actualRebarLength))) {
      errors.actualRebarLength = '请输入有效的实际钢筋长度数值'
    }
    if (data.difference && isNaN(parseFloat(data.difference))) {
      errors.difference = '请输入有效的差值数值'
    }
    
    return errors
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      modelD2040: '',
      cageNodesD2044: '',
      cageNumD2048: '',
      spindleAngleD4012: '',
      actualRebarLength: '',
      theoreticalLength: '',
      difference: '',
      totalNodesD2052: ''
    })
    setFormErrors({})
  }

  // 添加新记录
  const handleAddRecord = async () => {
    const errors = validateForm(formData)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/sy-plc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelD2040: parseFloat(formData.modelD2040),
          cageNodesD2044: parseFloat(formData.cageNodesD2044),
          cageNumD2048: parseFloat(formData.cageNumD2048),
          spindleAngleD4012: parseFloat(formData.spindleAngleD4012),
          theoreticalLength: parseFloat(formData.theoreticalLength),
          totalNodesD2052: parseFloat(formData.totalNodesD2052),
          actualRebarLength: formData.actualRebarLength ? parseFloat(formData.actualRebarLength) : null,
          difference: formData.difference ? parseFloat(formData.difference) : null,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchDatabaseRecords() // 刷新数据
        setIsAddModalOpen(false)
        resetForm()
        alert('记录添加成功！')
      } else {
        alert(`添加失败: ${result.error}`)
      }
    } catch (error) {
      console.error('添加记录失败:', error)
      alert('添加记录失败，请检查网络连接')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 编辑记录
  const handleEditRecord = (record: SyPlcRecord) => {
    setEditingRecord(record)
    setFormData({
      modelD2040: record.modelD2040.toString(),
      cageNodesD2044: record.cageNodesD2044.toString(),
      cageNumD2048: record.cageNumD2048.toString(),
      spindleAngleD4012: record.spindleAngleD4012.toString(),
      actualRebarLength: record.actualRebarLength?.toString() || '',
      theoreticalLength: record.theoreticalLength?.toString() || '',
      difference: record.difference?.toString() || '',
      totalNodesD2052: record.totalNodesD2052?.toString() || ''
    })
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  // 更新记录
  const handleUpdateRecord = async () => {
    if (!editingRecord) return
    
    const errors = validateForm(formData)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/sy-plc', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingRecord.id,
          modelD2040: parseFloat(formData.modelD2040),
          cageNodesD2044: parseFloat(formData.cageNodesD2044),
          cageNumD2048: parseFloat(formData.cageNumD2048),
          spindleAngleD4012: parseFloat(formData.spindleAngleD4012),
          actualRebarLength: parseFloat(formData.actualRebarLength),
          theoreticalLength: formData.theoreticalLength ? parseFloat(formData.theoreticalLength) : null,
          difference: formData.difference ? parseFloat(formData.difference) : null,
          totalNodesD2052: formData.totalNodesD2052 ? parseFloat(formData.totalNodesD2052) : null,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchDatabaseRecords() // 刷新数据
        setIsEditModalOpen(false)
        setEditingRecord(null)
        resetForm()
        alert('记录更新成功！')
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (error) {
      console.error('更新记录失败:', error)
      alert('更新记录失败，请检查网络连接')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除记录
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) {
      return
    }
    
    try {
      const response = await fetch(`/api/sy-plc?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchDatabaseRecords() // 刷新数据
      } else {
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      alert('删除记录失败，请检查网络连接')
    }
  }

  // 删除检索结果
  const handleDeleteFilteredRecords = async () => {
    const recordCount = filteredSyPlcRecords.length
    
    if (recordCount === 0) {
      alert('没有可删除的记录')
      return
    }

    if (!confirm(`确定要删除当前检索到的所有 ${recordCount} 条记录吗？此操作无法撤销。`)) {
      return
    }
    
    try {
      // 构建查询参数，与当前搜索条件保持一致
      const params = new URLSearchParams()
      params.append('deleteFiltered', 'true')
      
      // 添加搜索条件
      if (advancedSearchFields.modelD2040) {
        params.append('model', advancedSearchFields.modelD2040)
      }
      if (advancedSearchFields.cageNodesD2044) {
        params.append('cageNodes', advancedSearchFields.cageNodesD2044)
      }
      if (advancedSearchFields.cageNumD2048) {
        params.append('cageNum', advancedSearchFields.cageNumD2048)
      }
      if (advancedSearchFields.spindleAngleD4012) {
        params.append('angle', advancedSearchFields.spindleAngleD4012)
      }
      if (advancedSearchFields.actualRebarLength) {
        params.append('actualRebarLength', advancedSearchFields.actualRebarLength)
      }
      if (advancedSearchFields.theoreticalLength) {
        params.append('theoreticalLength', advancedSearchFields.theoreticalLength)
      }
      if (advancedSearchFields.difference) {
        params.append('difference', advancedSearchFields.difference)
      }
      if (advancedSearchFields.totalNodesD2052) {
        params.append('totalNodes', advancedSearchFields.totalNodesD2052)
      }
      if (advancedSearchFields.createdAtStart) {
        params.append('createdAtStart', advancedSearchFields.createdAtStart)
      }
      if (advancedSearchFields.createdAtEnd) {
        params.append('createdAtEnd', advancedSearchFields.createdAtEnd)
      }
      if (advancedSearchFields.updatedAtStart) {
        params.append('updatedAtStart', advancedSearchFields.updatedAtStart)
      }
      if (advancedSearchFields.updatedAtEnd) {
        params.append('updatedAtEnd', advancedSearchFields.updatedAtEnd)
      }

      const response = await fetch(`/api/sy-plc?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`成功删除 ${result.deletedCount} 条记录`)
        await fetchDatabaseRecords() // 刷新数据
      } else {
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('删除检索结果失败:', error)
      alert('删除检索结果失败，请检查网络连接')
    }
  }

  // 导出Excel文件
  const exportToExcel = () => {
    try {
      // 获取当前筛选后的数据
      const dataToExport = filteredSyPlcRecords.map((record, index) => ({
        '序号': index + 1,
        '型号 (modelD2040)': record.modelD2040,
        '笼子节点数 (cageNodesD2044)': record.cageNodesD2044,
        '笼子编号 (cageNumD2048)': record.cageNumD2048,
        '主轴角度 (spindleAngleD4012)': record.spindleAngleD4012,
        '实际钢筋长度': record.actualRebarLength,
        '理论长度': record.theoreticalLength || '',
        '差值': record.difference || '',
        '总节数 (totalNodesD2052)': record.totalNodesD2052 || '',
        '创建时间': new Date(record.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        '更新时间': new Date(record.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      }))

      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      
      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(dataToExport)

      // 设置列宽
      const colWidths = [
        { wch: 8 },  // 序号
        { wch: 20 }, // 型号
        { wch: 20 }, // 笼子节点数
        { wch: 20 }, // 笼子编号
        { wch: 20 }, // 主轴角度
        { wch: 20 }, // 实际钢筋长度
        { wch: 15 }, // 理论长度
        { wch: 15 }, // 差值
        { wch: 20 }, // 总节数
        { wch: 20 }, // 创建时间
        { wch: 20 }  // 更新时间
      ]
      worksheet['!cols'] = colWidths

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SyPlc数据库记录')

      // 生成文件名（包含当前时间）
      const now = new Date()
      const fileName = `SyPlc数据库记录_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`

      // 导出文件
      XLSX.writeFile(workbook, fileName)

      alert(`成功导出 ${dataToExport.length} 条记录到 ${fileName}`)
    } catch (error) {
      console.error('导出Excel失败:', error)
      alert('导出Excel失败，请重试')
    }
  }

  // 当搜索条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [advancedSearchFields])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 提示配置PLC地址的警告 */}
        {showConfigAlert && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium">请配置PLC连接参数</h3>
                <p className="mt-2 text-sm">
                  您需要在PLC配置标签页中设置有效的PLC IP地址才能使用PLC功能。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 焊笼机设备板块 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-gray-700" />
                <span className="text-gray-900 font-semibold">焊笼机设备 - {weldingMachineData.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  plcContext.isConnected 
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : plcContext.isConnecting
                    ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {plcContext.isConnected ? '已连接' : plcContext.isConnecting ? '连接中' : '未连接'}
                </span>
                
                {/* 心跳状态显示 */}
                {plcContext.isConnected && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    plcContext.isHeartbeatActive 
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`w-3 h-3 mr-1 rounded-full ${plcContext.isHeartbeatActive ? 'bg-green-500 heartbeat-blink' : 'bg-gray-400'}`}></div>
                    {plcContext.isHeartbeatActive ? '心跳活跃' : '心跳停止'}
                  </span>
                )}
                
                <div className={`p-2 rounded-full ${plcContext.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                  {plcContext.isConnected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              实时监控焊笼机运行状态和系统日志
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 标签页切换 */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  上位机日志
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('database')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'database'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Database className="h-4 w-4 inline mr-2" />
                  数据库记录
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('plcio')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'plcio'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  PLC读写
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'config'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Server className="h-4 w-4 inline mr-2" />
                  PLC配置
                </button>
              </nav>
            </div>

            {/* 上位机日志内容 */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">PLC通信日志</h3>
                    {filteredLogs.length > 0 && (
                      <span className="text-sm text-gray-500">
                        共 {filteredLogs.length} 条日志，第 {currentLogPage} / {totalLogPages} 页
                      </span>
                    )}
                    {plcStatus && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">当前连接状态:</span>
                        <span className={`px-3 py-1 rounded-md ${plcStatus.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plcStatus.isConnected ? '已连接' : '已断开'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="搜索日志..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">所有级别</option>
                      <option value="INFO">信息</option>
                      <option value="WARNING">警告</option>
                      <option value="ERROR">错误</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshData}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* PLC未连接提示 */}
                  {!plcStatus?.isConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800 mb-4">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
                        <div>
                          <h3 className="text-sm font-medium">PLC未连接</h3>
                          <p className="mt-2 text-sm">
                            您可以查看已有的日志记录，但无法获取实时数据。若需连接PLC，请点击
                            <button 
                              onClick={() => setActiveTab('config')} 
                              className="text-blue-600 underline hover:text-blue-800 mx-1"
                            >
                              此处
                            </button>
                            前往PLC配置标签页。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无日志记录
                    </div>
                  ) : (
                    currentLogs.map((log, index) => (
                      <div key={`log-${log.id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLogLevelColor(log.level)}`}>
                                {log.level}
                              </span>
                              <span className="text-sm text-gray-500">{log.timestamp}</span>
                              <span className="text-sm text-gray-600">来源: {log.source}</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{log.message}</h4>
                            {log.details && (
                              <p className="text-sm text-gray-600">{log.details}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 日志分页控件 */}
                  {filteredLogs.length > logsPerPage && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-6">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousLogPage}
                          disabled={currentLogPage === 1}
                        >
                          上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextLogPage}
                          disabled={currentLogPage === totalLogPages}
                        >
                          下一页
                        </Button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            显示第 <span className="font-medium">{(currentLogPage - 1) * logsPerPage + 1}</span> 到{' '}
                            <span className="font-medium">{Math.min(currentLogPage * logsPerPage, filteredLogs.length)}</span> 条，
                            共 <span className="font-medium">{filteredLogs.length}</span> 条日志
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToPreviousLogPage}
                              disabled={currentLogPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-600 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0 disabled:text-gray-300"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="sr-only">上一页</span>
                            </Button>
                            
                            {/* 页码按钮 */}
                            {Array.from({ length: totalLogPages }, (_, i) => i + 1).map((page) => {
                              // 只显示当前页附近的页码
                              if (
                                page === 1 ||
                                page === totalLogPages ||
                                (page >= currentLogPage - 2 && page <= currentLogPage + 2)
                              ) {
                                return (
                                  <Button
                                    key={page}
                                    variant={page === currentLogPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToLogPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                      page === currentLogPage
                                        ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                        : 'text-gray-800 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0'
                                    }`}
                                  >
                                    {page}
                                  </Button>
                                )
                              } else if (
                                page === currentLogPage - 3 ||
                                page === currentLogPage + 3
                              ) {
                                return (
                                  <span
                                    key={page}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                                  >
                                    ...
                                  </span>
                                )
                              }
                              return null
                            })}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={goToNextLogPage}
                              disabled={currentLogPage === totalLogPages}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-600 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0 disabled:text-gray-300"
                            >
                              <ChevronRight className="h-4 w-4" />
                              <span className="sr-only">下一页</span>
                            </Button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 数据库记录内容 */}
            {activeTab === 'database' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">SyPlc数据库记录</h3>
                    {filteredSyPlcRecords.length > 0 && (
                      <span className="text-sm text-gray-500">
                        共 {filteredSyPlcRecords.length} 条记录，第 {currentPage} / {totalPages} 页
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={isAdvancedSearchOpen ? "default" : "outline"}
                      size="sm"
                      onClick={toggleSearchMode}
                      className={isAdvancedSearchOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {isAdvancedSearchOpen ? '收起搜索' : '展开搜索'}
                    </Button>
                    {isAdvancedSearchOpen && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAdvancedSearch}
                        className="text-white bg-gray-600 hover:bg-gray-700 border-gray-600 hover:border-gray-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        清空搜索
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchDatabaseRecords()}
                      disabled={isLoadingRecords}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      添加记录
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={exportToExcel}
                      disabled={filteredSyPlcRecords.length === 0}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                    {isAdvancedSearchOpen && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDeleteFilteredRecords}
                        disabled={filteredSyPlcRecords.length === 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除检索结果
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 高级搜索面板 */}
                {isAdvancedSearchOpen && (
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">型号 (modelD2040)</label>
                          <Input
                            placeholder="搜索型号..."
                            value={advancedSearchFields.modelD2040}
                            onChange={(e) => handleAdvancedSearchChange('modelD2040', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">笼子节数 (cageNodesD2044)</label>
                          <Input
                            placeholder="搜索笼子节数..."
                            value={advancedSearchFields.cageNodesD2044}
                            onChange={(e) => handleAdvancedSearchChange('cageNodesD2044', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">笼子编号 (cageNumD2048)</label>
                          <Input
                            placeholder="搜索笼子编号..."
                            value={advancedSearchFields.cageNumD2048}
                            onChange={(e) => handleAdvancedSearchChange('cageNumD2048', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">主轴角度 (spindleAngleD4012)</label>
                          <Input
                            placeholder="搜索主轴角度..."
                            value={advancedSearchFields.spindleAngleD4012}
                            onChange={(e) => handleAdvancedSearchChange('spindleAngleD4012', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">实际钢筋长度 (actualRebarLength)</label>
                          <Input
                            placeholder="搜索钢筋长度..."
                            value={advancedSearchFields.actualRebarLength}
                            onChange={(e) => handleAdvancedSearchChange('actualRebarLength', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">理论长度 (theoreticalLength)</label>
                          <Input
                            placeholder="搜索理论长度..."
                            value={advancedSearchFields.theoreticalLength}
                            onChange={(e) => handleAdvancedSearchChange('theoreticalLength', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">差值 (difference)</label>
                          <Input
                            placeholder="搜索差值..."
                            value={advancedSearchFields.difference}
                            onChange={(e) => handleAdvancedSearchChange('difference', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">总节数 (totalNodesD2052)</label>
                          <Input
                            placeholder="搜索总节数..."
                            value={advancedSearchFields.totalNodesD2052}
                            onChange={(e) => handleAdvancedSearchChange('totalNodesD2052', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      {/* 时间搜索区域 */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">创建时间开始</label>
                            <Input
                              type="date"
                              value={advancedSearchFields.createdAtStart}
                              onChange={(e) => handleAdvancedSearchChange('createdAtStart', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">创建时间结束</label>
                            <Input
                              type="date"
                              value={advancedSearchFields.createdAtEnd}
                              onChange={(e) => handleAdvancedSearchChange('createdAtEnd', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">更新时间开始</label>
                            <Input
                              type="date"
                              value={advancedSearchFields.updatedAtStart}
                              onChange={(e) => handleAdvancedSearchChange('updatedAtStart', e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">更新时间结束</label>
                            <Input
                              type="date"
                              value={advancedSearchFields.updatedAtEnd}
                              onChange={(e) => handleAdvancedSearchChange('updatedAtEnd', e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>


                    </CardContent>
                  </Card>
                )}
                
                {isLoadingRecords ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    正在加载数据库记录...
                  </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-center py-3 px-4 font-medium text-gray-900">型号</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">笼子节数</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">笼子编号</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">主轴角度</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">实际钢筋长度</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">理论长度</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">差值</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">总节数</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">创建时间</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">更新时间</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                        {filteredSyPlcRecords.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-8 text-gray-500">
                              {Object.values(advancedSearchFields).some(value => value.trim() !== '') ? '没有找到匹配的记录' : '暂无数据库记录'}
                          </td>
                        </tr>
                        ) : (
                          currentRecords.map((record: any, index: number) => (
                            <tr key={`syplc-record-${record.id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.modelD2040}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.cageNodesD2044}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.cageNumD2048}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.spindleAngleD4012}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.actualRebarLength ?? '-'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.theoreticalLength ?? '-'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.difference ?? '-'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-center">{record.totalNodesD2052 ?? '-'}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 text-center">{new Date(record.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</td>
                              <td className="py-3 px-4 text-sm text-gray-600 text-center">{new Date(record.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</td>
                              <td className="py-3 px-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditRecord(record)}
                                    className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                    </tbody>
                  </table>
                </div>
                )}
                
                {/* 分页控制 */}
                {filteredSyPlcRecords.length > recordsPerPage && (
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                                                      显示第 <span className="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> 到{' '}
                            <span className="font-medium">{Math.min(currentPage * recordsPerPage, filteredSyPlcRecords.length)}</span> 条，
                          共 <span className="font-medium">{filteredSyPlcRecords.length}</span> 条记录
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-600 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0 disabled:text-gray-300"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">上一页</span>
                          </Button>
                          
                          {/* 页码按钮 */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // 只显示当前页附近的页码
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 2 && page <= currentPage + 2)
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={page === currentPage ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => goToPage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    page === currentPage
                                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                      : 'text-gray-800 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0'
                                  }`}
                                >
                                  {page}
                                </Button>
                              )
                            } else if (
                              page === currentPage - 3 ||
                              page === currentPage + 3
                            ) {
                              return (
                                <span
                                  key={page}
                                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                                >
                                  ...
                                </span>
                              )
                            }
                            return null
                          })}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-600 bg-white ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:text-blue-700 focus:z-20 focus:outline-offset-0 disabled:text-gray-300"
                          >
                            <span className="sr-only">下一页</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}

                {/* 添加记录模态框 */}
                {isAddModalOpen && (
                  <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border-4 border-blue-500 shadow-2xl shadow-blue-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">添加新记录</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddModalOpen(false)
                            resetForm()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            型号 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.modelD2040}
                            onChange={(e) => setFormData(prev => ({ ...prev, modelD2040: e.target.value }))}
                            className={formErrors.modelD2040 ? 'border-red-500' : ''}
                            placeholder="请输入型号"
                          />
                          {formErrors.modelD2040 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.modelD2040}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            笼子节数 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.cageNodesD2044}
                            onChange={(e) => setFormData(prev => ({ ...prev, cageNodesD2044: e.target.value }))}
                            className={formErrors.cageNodesD2044 ? 'border-red-500' : ''}
                            placeholder="请输入笼子节数"
                          />
                          {formErrors.cageNodesD2044 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.cageNodesD2044}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            笼子编号 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.cageNumD2048}
                            onChange={(e) => setFormData(prev => ({ ...prev, cageNumD2048: e.target.value }))}
                            className={formErrors.cageNumD2048 ? 'border-red-500' : ''}
                            placeholder="请输入笼子编号"
                          />
                          {formErrors.cageNumD2048 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.cageNumD2048}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            主轴角度 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.spindleAngleD4012}
                            onChange={(e) => setFormData(prev => ({ ...prev, spindleAngleD4012: e.target.value }))}
                            className={formErrors.spindleAngleD4012 ? 'border-red-500' : ''}
                            placeholder="请输入主轴角度"
                          />
                          {formErrors.spindleAngleD4012 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.spindleAngleD4012}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            实际钢筋长度
                          </label>
                          <Input
                            type="number"
                            value={formData.actualRebarLength}
                            onChange={(e) => setFormData(prev => ({ ...prev, actualRebarLength: e.target.value }))}
                            className={formErrors.actualRebarLength ? 'border-red-500' : ''}
                            placeholder="请输入实际钢筋长度（可选）"
                          />
                          {formErrors.actualRebarLength && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.actualRebarLength}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            理论长度 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.theoreticalLength}
                            onChange={(e) => setFormData(prev => ({ ...prev, theoreticalLength: e.target.value }))}
                            className={formErrors.theoreticalLength ? 'border-red-500' : ''}
                            placeholder="请输入理论长度"
                          />
                          {formErrors.theoreticalLength && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.theoreticalLength}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            差值
                          </label>
                          <Input
                            type="number"
                            value={formData.difference}
                            onChange={(e) => setFormData(prev => ({ ...prev, difference: e.target.value }))}
                            className={formErrors.difference ? 'border-red-500' : ''}
                            placeholder="请输入差值（可选）"
                          />
                          {formErrors.difference && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.difference}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            总节数 (D2052) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.totalNodesD2052}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalNodesD2052: e.target.value }))}
                            className={formErrors.totalNodesD2052 ? 'border-red-500' : ''}
                            placeholder="请输入总节数"
                          />
                          {formErrors.totalNodesD2052 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.totalNodesD2052}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddModalOpen(false)
                            resetForm()
                          }}
                          disabled={isSubmitting}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleAddRecord}
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              添加中...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              添加
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 编辑记录模态框 */}
                {isEditModalOpen && editingRecord && (
                  <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border-4 border-green-500 shadow-2xl shadow-green-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">编辑记录</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditModalOpen(false)
                            setEditingRecord(null)
                            resetForm()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            型号 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.modelD2040}
                            onChange={(e) => setFormData(prev => ({ ...prev, modelD2040: e.target.value }))}
                            className={formErrors.modelD2040 ? 'border-red-500' : ''}
                            placeholder="请输入型号"
                          />
                          {formErrors.modelD2040 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.modelD2040}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            笼子节数 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.cageNodesD2044}
                            onChange={(e) => setFormData(prev => ({ ...prev, cageNodesD2044: e.target.value }))}
                            className={formErrors.cageNodesD2044 ? 'border-red-500' : ''}
                            placeholder="请输入笼子节数"
                          />
                          {formErrors.cageNodesD2044 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.cageNodesD2044}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            笼子编号 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.cageNumD2048}
                            onChange={(e) => setFormData(prev => ({ ...prev, cageNumD2048: e.target.value }))}
                            className={formErrors.cageNumD2048 ? 'border-red-500' : ''}
                            placeholder="请输入笼子编号"
                          />
                          {formErrors.cageNumD2048 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.cageNumD2048}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            主轴角度 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.spindleAngleD4012}
                            onChange={(e) => setFormData(prev => ({ ...prev, spindleAngleD4012: e.target.value }))}
                            className={formErrors.spindleAngleD4012 ? 'border-red-500' : ''}
                            placeholder="请输入主轴角度"
                          />
                          {formErrors.spindleAngleD4012 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.spindleAngleD4012}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            实际钢筋长度
                          </label>
                          <Input
                            type="number"
                            value={formData.actualRebarLength}
                            onChange={(e) => setFormData(prev => ({ ...prev, actualRebarLength: e.target.value }))}
                            className={formErrors.actualRebarLength ? 'border-red-500' : ''}
                            placeholder="请输入实际钢筋长度（可选）"
                          />
                          {formErrors.actualRebarLength && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.actualRebarLength}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            理论长度 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.theoreticalLength}
                            onChange={(e) => setFormData(prev => ({ ...prev, theoreticalLength: e.target.value }))}
                            className={formErrors.theoreticalLength ? 'border-red-500' : ''}
                            placeholder="请输入理论长度"
                          />
                          {formErrors.theoreticalLength && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.theoreticalLength}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            差值
                          </label>
                          <Input
                            type="number"
                            value={formData.difference}
                            onChange={(e) => setFormData(prev => ({ ...prev, difference: e.target.value }))}
                            className={formErrors.difference ? 'border-red-500' : ''}
                            placeholder="请输入差值（可选）"
                          />
                          {formErrors.difference && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.difference}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            总节数 (D2052) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={formData.totalNodesD2052}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalNodesD2052: e.target.value }))}
                            className={formErrors.totalNodesD2052 ? 'border-red-500' : ''}
                            placeholder="请输入总节数"
                          />
                          {formErrors.totalNodesD2052 && (
                            <p className="text-xs text-red-500 mt-1">{formErrors.totalNodesD2052}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditModalOpen(false)
                            setEditingRecord(null)
                            resetForm()
                          }}
                          disabled={isSubmitting}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleUpdateRecord}
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              更新中...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              更新
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* PLC读写内容 */}
            {activeTab === 'plcio' && (
              <div className="space-y-6">
                {/* PLC连接状态和操作按钮 */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">PLC读写控制</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">连接状态:</span>
                        <span className={`px-3 py-1 rounded-md ${plcContext.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plcContext.isConnected ? '已连接' : '已断开'}
                        </span>
                      </div>
                      {plcContext.isConnected && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">心跳状态:</span>
                          <span className={`px-3 py-1 rounded-md flex items-center ${plcContext.isHeartbeatActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            <div className={`w-3 h-3 mr-2 rounded-full ${plcContext.isHeartbeatActive ? 'bg-green-500 heartbeat-blink' : 'bg-gray-400'}`}></div>
                            {plcContext.isHeartbeatActive ? '活跃(M4005)' : '停止'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {/* 连接按钮已移除 */}
                  </div>
                </div>
                
                {/* 错误提示 */}
                {plcError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {plcError}
                  </div>
                )}
                
                {/* PLC未连接提示 */}
                {!plcStatus?.isConnected && !plcError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    PLC未连接，无法进行读写操作。若需连接PLC，请点击
                    <button 
                      onClick={() => setActiveTab('config')} 
                      className="text-blue-600 underline hover:text-blue-800 mx-1"
                    >
                      此处
                    </button>
                    前往PLC配置标签页。
                  </div>
                )}
                
                {/* 32位浮点寄存器读写 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <Gauge className="h-5 w-5 mr-2 text-blue-600" />
                    32位浮点寄存器读写
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">寄存器地址</label>
                        <div className="flex space-x-2">
                          <Input 
                            type="number" 
                            value={floatRegisterAddress}
                            onChange={(e) => handleFloatAddressInputChange(e.target.value)}
                            onBlur={handleFloatAddressBlur}
                            onWheel={handleWheel}
                            className="w-32"
                          />
                          <Button 
                            variant="outline" 
                            onClick={readFloatRegister}
                            disabled={!plcStatus?.isConnected || isReadingFloat}
                          >
                            {isReadingFloat ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            读取
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">当前值</label>
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                          {floatRegisterValue !== null ? (
                            <span className="text-lg text-gray-900">{typeof floatRegisterValue === 'number' ? floatRegisterValue.toFixed(4) : floatRegisterValue}</span>
                          ) : (
                            <span className="text-gray-500">尚未读取</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">写入值</label>
                        <div className="flex space-x-2">
                          <Input 
                            type="text" 
                            value={floatInputValue}
                            onChange={(e) => setFloatInputValue(e.target.value)}
                            placeholder="输入32位浮点数"
                          />
                          <Button 
                            variant="outline" 
                            onClick={writeFloatRegister}
                            disabled={!plcStatus?.isConnected || isWritingFloat || !floatInputValue}
                          >
                            {isWritingFloat ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            写入
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          例如: 3.14, -2.5, 0.01
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 线圈M读写 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <ToggleLeft className="h-5 w-5 mr-2 text-blue-600" />
                    线圈M读写
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">线圈地址(M)</label>
                        <div className="flex space-x-2">
                          <Input 
                            type="number" 
                            value={coilAddress}
                            onChange={(e) => handleCoilAddressInputChange(e.target.value)}
                            onBlur={handleCoilAddressBlur}
                            onWheel={handleWheel}
                            className="w-32"
                          />
                          <Button 
                            variant="outline" 
                            onClick={readCoil}
                            disabled={!plcStatus?.isConnected || isReadingCoil}
                          >
                            {isReadingCoil ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            读取
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">当前状态</label>
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                          {coilValue !== null ? (
                            <div className="flex items-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-2 ${
                                coilValue ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {coilValue ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                )}
                              </span>
                              <span className={`text-lg ${coilValue ? 'text-green-700' : 'text-red-700'}`}>
                                {coilValue ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">尚未读取</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">控制</label>
                        <div className="flex space-x-4">
                          <Button 
                            variant="outline" 
                            className={`flex-1 ${coilValue ? 'border-green-500 text-green-600' : ''}`}
                            onClick={() => writeCoil(true)}
                            disabled={!plcStatus?.isConnected || isWritingCoil}
                          >
                            <ToggleRight className="h-4 w-4 mr-2" />
                            打开
                          </Button>
                          <Button 
                            variant="outline"
                            className={`flex-1 ${coilValue === false ? 'border-red-500 text-red-600' : ''}`}
                            onClick={() => writeCoil(false)}
                            disabled={!plcStatus?.isConnected || isWritingCoil}
                          >
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            关闭
                          </Button>
                        </div>
                        {isWritingCoil && (
                          <p className="text-xs text-center text-gray-500 mt-2">
                            <RefreshCw className="h-3 w-3 inline mr-1 animate-spin" />
                            更新中...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PLC配置内容 */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900">PLC连接配置</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">连接状态:</span>
                        <span className={`px-3 py-1 rounded-md ${plcStatus?.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plcStatus?.isConnected ? '已连接' : '已断开'}
                        </span>
                      </div>
                      {plcStatus?.isConnected && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">心跳状态:</span>
                          <span className={`px-3 py-1 rounded-md flex items-center ${plcContext.isHeartbeatActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            <div className={`w-3 h-3 mr-2 rounded-full ${plcContext.isHeartbeatActive ? 'bg-green-500 heartbeat-blink' : 'bg-gray-400'}`}></div>
                            {plcContext.isHeartbeatActive ? '活跃(M4005)' : '停止'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetConfig}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重置
                    </Button>
                    {plcStatus?.isConnected ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={disconnectPLC}
                        disabled={isLoading}
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        {isLoading ? '断开中...' : '断开连接'}
                      </Button>
                    ) : (
                      <Button
                        variant={connectionError ? "secondary" : "outline"}
                        size="sm" 
                        onClick={connectPLC}
                        disabled={isLoading || !plcConfig.host}
                        className={connectionError ? "bg-blue-100 hover:bg-blue-200 border-blue-500 text-blue-700" : ""}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            {connectAttempts === 0 ? '连接中...' : `重试中(${connectAttempts}/1)`}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            {connectionError ? '重新连接' : '连接PLC'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* 错误或成功提示 */}
                {plcError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {plcError}
                  </div>
                )}
                

                
                {connectionError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">连接错误</h3>
                        <p className="mt-2 text-sm text-red-700">{connectionError}</p>
                        {connectionError.includes('ECONNREFUSED') && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p className="font-medium">可能的解决方案:</p>
                            <ul className="mt-1 list-disc list-inside pl-2">
                              <li>检查PLC设备是否已开启</li>
                              <li>确认IP地址和端口号正确无误</li>
                              <li>检查网络连接是否正常</li>
                              <li>确认防火墙设置是否允许Modbus TCP连接</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <Server className="h-5 w-5 mr-2 text-blue-600" />
                    PLC连接参数
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
                        <Input 
                          type="text" 
                          value={plcConfig.host}
                          onChange={(e) => handleConfigChange('host', e.target.value)}
                          placeholder="例如: 192.168.6.6"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
                        <Input 
                          type="number" 
                          value={plcConfig.port}
                          onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 502)}
                          onWheel={handleWheel}
                          placeholder="默认: 502"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">单元ID</label>
                        <Input 
                          type="number" 
                          value={plcConfig.unitId}
                          onChange={(e) => handleConfigChange('unitId', parseInt(e.target.value) || 1)}
                          onWheel={handleWheel}
                          placeholder="默认: 1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">连接超时(毫秒)</label>
                        <Input 
                          type="number" 
                          value={plcConfig.timeout}
                          onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 5000)}
                          onWheel={handleWheel}
                          placeholder="默认: 5000"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">重连间隔(毫秒)</label>
                        <Input 
                          type="number" 
                          value={plcConfig.reconnectInterval}
                          onChange={(e) => handleConfigChange('reconnectInterval', parseInt(e.target.value) || 3000)}
                          onWheel={handleWheel}
                          placeholder="默认: 3000"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">最大重连次数</label>
                        <Input 
                          type="number" 
                          value={plcConfig.maxReconnectAttempts}
                          onChange={(e) => handleConfigChange('maxReconnectAttempts', parseInt(e.target.value) || 3)}
                          onWheel={handleWheel}
                          placeholder="默认: 3"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 钢筋测量位置参数配置 */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-green-600" />
                    钢筋测量位置参数
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    配置8个钢筋测量位置的参数值，所有参数都不能为空。支持负数和小数（如：-10.5、25.75）。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.keys(plcConfig.measurePositions).map((position, index) => (
                      <div key={position} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          钢筋测量位置{index + 1}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Input
                          type="number"
                          value={plcConfig.measurePositions[position as keyof typeof plcConfig.measurePositions]}
                          onChange={(e) => {
                            handleMeasurePositionInputChange(position, e.target.value)
                          }}
                          onBlur={() => {
                            handleMeasurePositionBlur(position)
                          }}
                          onWheel={handleWheel}
                          placeholder="可输入负数和小数"
                          className={measurePositionErrors[position] ? 'border-red-500' : ''}
                          step="0.01"
                          min={undefined}
                        />
                        {measurePositionErrors[position] && (
                          <p className="text-xs text-red-500 mt-1">
                            {measurePositionErrors[position]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 验证按钮 */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const defaultPositions = {
                          position1: 0, position2: 0, position3: 0, position4: 0,
                          position5: 0, position6: 0, position7: 0, position8: 0
                        }
                        setPlcConfig(prev => ({
                          ...prev,
                          measurePositions: defaultPositions
                        }))
                        saveMeasurePositions(defaultPositions)
                        setMeasurePositionErrors({})
                      }}
                    >
                      重置为默认值
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const isValid = validateMeasurePositions(plcConfig.measurePositions)
                          if (!isValid) {
                            alert('请先填写所有必填的测量位置参数')
                            return
                          }

                          const response = await fetch('/api/measure-positions', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              measurePositions: plcConfig.measurePositions
                            })
                          })

                          const result = await response.json()
                          
                          if (result.success) {
                            alert('参数已成功保存到文件！现在可以读取到这些配置。')
                          } else {
                            alert(`保存失败: ${result.error}`)
                          }
                        } catch (error) {
                          console.error('保存参数到文件失败:', error)
                          alert('保存参数到文件失败，请检查网络连接')
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      保存到文件
                    </Button>
                    <Button
                      onClick={() => {
                        const isValid = validateMeasurePositions(plcConfig.measurePositions)
                        if (isValid) {
                          alert('所有测量位置参数验证成功！')
                        } else {
                          alert('请填写所有必填的测量位置参数')
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      验证参数
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  <p><strong>提示:</strong> 更改IP地址和端口等配置后，可直接使用连接按钮尝试连接PLC。如需恢复默认配置，请点击"重置"按钮。</p>
                  <p className="mt-2"><strong>重要:</strong> 钢筋测量位置参数修改后会自动保存到浏览器本地存储，但要让规则能够读取到这些参数，必须点击<span className="font-semibold text-blue-600">"保存到文件"</span>按钮将参数同步到服务器文件中。</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 
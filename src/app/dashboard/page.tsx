"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building, Package, Truck, TrendingUp, Activity } from "lucide-react"

// 统计数据
const stats = [
  {
    name: '总用户数',
    value: '1,234',
    change: '+12%',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: '设备总数',
    value: '567',
    change: '+8%',
    changeType: 'positive',
    icon: Building,
  },
  {
    name: '产品数量',
    value: '890',
    change: '+15%',
    changeType: 'positive',
    icon: Package,
  },
  {
    name: '物流订单',
    value: '234',
    change: '-3%',
    changeType: 'negative',
    icon: Truck,
  },
]

// 最近活动
const recentActivities = [
  {
    id: 1,
    user: '张三',
    action: '登录系统',
    time: '2分钟前',
    type: 'login',
  },
  {
    id: 2,
    user: '李四',
    action: '更新设备信息',
    time: '5分钟前',
    type: 'update',
  },
  {
    id: 3,
    user: '王五',
    action: '创建新用户',
    time: '10分钟前',
    type: 'create',
  },
  {
    id: 4,
    user: '赵六',
    action: '导出报表',
    time: '15分钟前',
    type: 'export',
  },
]

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600">欢迎使用森源管理系统</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="flex items-center text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">较上月</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 最近活动 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                最近活动
              </CardTitle>
              <CardDescription>
                系统最近的操作记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {activity.user.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.user}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.action}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 系统状态 */}
          <Card>
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
              <CardDescription>
                当前系统运行状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">数据库连接</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API服务</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">文件存储</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    正常
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">系统负载</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    中等
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 
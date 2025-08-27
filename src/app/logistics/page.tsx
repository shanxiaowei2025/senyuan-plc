"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Truck } from "lucide-react"

export default function LogisticsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物流管理</h1>
            <p className="text-gray-600">管理物流运输和配送信息</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建物流订单
          </Button>
        </div>

        {/* 主要内容区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              物流订单
            </CardTitle>
            <CardDescription>
              管理系统中的所有物流订单信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">物流管理模块</h3>
              <p className="text-gray-600 mb-4">
                此模块用于管理物流运输信息，包括订单跟踪、配送状态、运输路线等。
              </p>
              <p className="text-sm text-gray-500">
                功能开发中，敬请期待...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
} 
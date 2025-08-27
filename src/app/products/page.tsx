"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Package } from "lucide-react"

export default function ProductsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
            <p className="text-gray-600">管理公司产品信息和库存</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            添加产品
          </Button>
        </div>

        {/* 主要内容区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              产品列表
            </CardTitle>
            <CardDescription>
              管理系统中的所有产品信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">产品管理模块</h3>
              <p className="text-gray-600 mb-4">
                此模块用于管理公司的产品信息，包括产品详情、库存管理、价格等。
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
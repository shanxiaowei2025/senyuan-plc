"use client"

import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="space-y-6">
          {/* 404 图标 */}
          <div className="text-6xl font-bold text-gray-300">404</div>
          
          {/* 标题和描述 */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">页面未找到</h1>
            <p className="text-gray-600 max-w-md">
              抱歉，您访问的页面不存在或已被移动。请检查 URL 是否正确，或返回首页。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回上页
            </Button>
          </div>

          {/* 快速链接 */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">快速导航：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link 
                href="/dashboard" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                仪表板
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                href="/users" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                用户管理
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                href="/devices" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                设备管理
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                href="/products" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                产品管理
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 
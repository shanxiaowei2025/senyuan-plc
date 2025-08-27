"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error("页面错误:", error)
  }, [error])

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="space-y-6">
          {/* 错误图标 */}
          <div className="flex justify-center">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          
          {/* 错误信息 */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">出现错误</h1>
            <p className="text-gray-600 max-w-md">
              抱歉，页面加载时出现了错误。请尝试刷新页面或返回首页。
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  错误详情 (仅开发环境)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </Link>
            </Button>
          </div>

          {/* 联系支持 */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              如果问题持续存在，请联系技术支持
            </p>
            <p className="text-sm text-gray-500">
              邮箱: support@senyuan.com
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 
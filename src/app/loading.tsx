import { MainLayout } from "@/components/layout/main-layout"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <h2 className="text-lg font-medium text-gray-900">加载中...</h2>
          <p className="text-sm text-gray-500">请稍候，正在加载页面内容</p>
        </div>
      </div>
    </MainLayout>
  )
} 
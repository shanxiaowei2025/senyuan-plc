"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Users, 
  Settings, 
  BarChart3, 
  FileText, 
  Home,
  Building,
  Package,
  Truck
} from "lucide-react"

// 侧边栏导航项配置
const navigation = [
  { name: '首页', href: '/', icon: Home },
  { name: '仪表板', href: '/dashboard', icon: BarChart3 },
  { name: '用户管理', href: '/users', icon: Users },
  { name: '设备管理', href: '/devices', icon: Building },
  { name: '产品管理', href: '/products', icon: Package },
  { name: '物流管理', href: '/logistics', icon: Truck },
  { name: '系统日志', href: '/logs', icon: FileText },
  { name: '系统设置', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">森源管理</h1>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-100 text-indigo-700 border-r-2 border-indigo-500"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon 
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                )} 
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* 底部信息 */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 text-center">
          <p>森源管理系统</p>
          <p>版本 1.0.0</p>
        </div>
      </div>
    </div>
  )
} 
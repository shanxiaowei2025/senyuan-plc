import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// 合并 Tailwind CSS 类名的工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 格式化日期
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化UTC+8时间为中文显示
export function formatUTC8Date(date: Date | string): string {
  const d = new Date(date)
  // 转换为UTC+8时间显示
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生成UTC+8时间的ISO字符串
export function getUTC8TimeString(): string {
  const now = new Date()
  // 系统已经是CST时区，直接返回ISO字符串
  return now.toISOString()
}

// 将任意时间转换为UTC+8时间字符串
export function toUTC8TimeString(date?: Date | string): string {
  const d = date ? new Date(date) : new Date()
  // 系统已经是CST时区，直接返回ISO字符串
  return d.toISOString()
}

// 获取当前UTC+8时间的Date对象
export function getUTC8Date(): Date {
  // 直接返回本地时间，因为系统已经是CST时区
  return new Date()
}

// 生成随机字符串
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证密码强度
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('密码长度至少8位')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码需要包含大写字母')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含小写字母')
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码需要包含数字')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 
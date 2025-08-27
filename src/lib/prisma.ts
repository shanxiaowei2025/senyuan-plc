import { PrismaClient } from '@prisma/client'

// 全局变量声明，用于开发环境的热重载
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端实例
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// 在开发环境中，将实例保存到全局变量以避免热重载时创建多个实例
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 
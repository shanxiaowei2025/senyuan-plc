import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     description: 分页获取用户列表，支持按姓名、邮箱搜索和角色筛选
 *     tags:
 *       - 用户管理
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词(姓名或邮箱)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, ADMIN, USER, OPERATOR]
 *           default: all
 *         description: 用户角色过滤
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '获取用户列表失败'
 */
// GET /api/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    // 构建查询条件
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (role && role !== 'all') {
      where.role = role
    }

    // 获取用户总数
    const total = await prisma.user.count({ where })

    // 获取用户列表
    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /users:
 *   post:
 *     summary: 创建新用户
 *     description: 创建一个新用户并返回用户信息
 *     tags:
 *       - 用户管理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: 用户姓名
 *                 example: "张三"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 用户邮箱(唯一)
 *                 example: "zhangsan@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 用户密码
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, USER, OPERATOR]
 *                 default: USER
 *                 description: 用户角色
 *                 example: "USER"
 *               department:
 *                 type: string
 *                 description: 用户部门
 *                 example: "技术部"
 *     responses:
 *       200:
 *         description: 用户创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: '用户创建成功'
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 'user_123456'
 *                     name:
 *                       type: string
 *                       example: '张三'
 *                     email:
 *                       type: string
 *                       example: 'zhangsan@example.com'
 *                     role:
 *                       type: string
 *                       example: 'USER'
 *                     department:
 *                       type: string
 *                       example: '技术部'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求参数错误或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '姓名、邮箱和密码为必填项'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '创建用户失败'
 */
// POST /api/users - 创建新用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, department } = body

    // 验证必填字段
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '姓名、邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '邮箱已存在' },
        { status: 400 }
      )
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // 注意：实际项目中应该加密密码
        role: role || 'USER',
        profile: {
          create: {
            department: department || '',
          },
        },
      },
      include: {
        profile: true,
      },
    })

    return NextResponse.json({
      message: '用户创建成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.profile?.department,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    )
  }
} 
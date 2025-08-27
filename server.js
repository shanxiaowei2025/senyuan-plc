#!/usr/bin/env node

/**
 * 森源管理系统 - 生产环境服务器
 * 用于离线部署包的服务器启动文件
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

// 环境配置
const dev = false  // 生产环境
const hostname = 'localhost'
const port = process.env.PORT || 3001

// 创建Next.js应用
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

console.log('🚀 正在启动森源管理系统...')

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('处理请求时出错:', err)
      res.statusCode = 500
      res.end('服务器内部错误')
    }
  })
  .once('error', (err) => {
    console.error('服务器启动失败:', err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log('✅ 森源管理系统已启动!')
    console.log(`🌐 访问地址: http://${hostname}:${port}`)
    console.log('📱 请在浏览器中打开上述地址')
    console.log('⚡ 按 Ctrl+C 停止服务器')
  })
}) 
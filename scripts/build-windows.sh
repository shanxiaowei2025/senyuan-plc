#!/bin/bash

echo "=========================================="
echo "   森源管理系统 - Windows打包脚本"
echo "=========================================="
echo ""

# 1. 清理旧构建
echo "[1/6] 清理旧构建..."
rm -rf .next dist-electron node_modules_npm

# 2. 使用npm安装完整依赖（避免pnpm符号链接问题）
echo ""
echo "[2/6] 使用npm安装完整依赖..."
npm install --legacy-peer-deps

# 3. 生成Prisma客户端
echo ""
echo "[3/6] 生成Prisma客户端..."
npm run db:generate

# 4. 构建Next.js
echo ""
echo "[4/6] 构建Next.js应用..."
npm run build

# 5. 打包Windows可执行文件
echo ""
echo "[5/6] 打包Windows可执行文件..."
npm exec electron-builder -- --win --x64

# 6. 完成
echo ""
echo "=========================================="
echo "✅ 打包完成！"
echo "=========================================="
echo ""
echo "📦 安装包位置: dist-electron/森源管理系统-0.1.0-x64.exe"
echo ""

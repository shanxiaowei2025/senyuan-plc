@echo off
chcp 65001
echo ========================================
echo    森源管理系统 - Windows打包工具
echo    (请在Windows电脑上运行此脚本)
echo ========================================
echo.

echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装Node.js
    echo 请访问 https://nodejs.org 下载安装Node.js 18+
    pause
    exit /b 1
)
echo ✓ Node.js 已安装

echo.
echo [2/5] 清理旧构建...
if exist .next rmdir /s /q .next
if exist dist-electron rmdir /s /q dist-electron
echo ✓ 清理完成

echo.
echo [3/5] 安装项目依赖...
call pnpm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖安装完成

echo.
echo [4/5] 生成Prisma客户端并构建Next.js...
call pnpm run db:generate
if errorlevel 1 (
    echo ❌ Prisma生成失败
    pause
    exit /b 1
)
call pnpm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✓ Next.js构建完成

echo.
echo [5/5] 打包Windows可执行文件...
call pnpm exec electron-builder --win --x64
if errorlevel 1 (
    echo ❌ 打包失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 打包完成！
echo ========================================
echo.
echo 📦 安装包位置: dist-electron\森源管理系统-0.1.0-x64.exe
echo.
echo 💡 提示: 
echo    - 双击安装包进行安装
echo    - 安装完成后可在桌面找到快捷方式
echo    - 首次启动需要等待5-10秒
echo.
pause

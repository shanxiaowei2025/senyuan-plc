# 在Mac上打包Windows可执行文件的解决方案

## 🎯 方案对比

| 方案 | 难度 | 时间 | 成本 | 推荐度 |
|------|------|------|------|--------|
| GitHub Actions自动化 | ⭐⭐ | 10分钟 | 免费 | ⭐⭐⭐⭐⭐ |
| 云端Windows | ⭐ | 5分钟 | 免费试用 | ⭐⭐⭐⭐ |
| Parallels虚拟机 | ⭐⭐⭐ | 1小时 | 付费 | ⭐⭐⭐ |
| 先发开发版 | ⭐ | 立即 | 免费 | ⭐⭐ |

---

## 🚀 方案1：GitHub Actions自动化打包（推荐）

**完全免费，无需Windows电脑**

### 步骤1：推送代码到GitHub

```bash
# 如果还没有Git仓库，先初始化
git init
git add .
git commit -m "Initial commit"

# 创建GitHub仓库后
git remote add origin https://github.com/你的用户名/manage.git
git push -u origin main
```

### 步骤2：创建GitHub Actions配置

我帮您创建配置文件：

```yaml
# .github/workflows/build-windows.yml
name: Build Windows Executable

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # 允许手动触发

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - name: 检出代码
      uses: actions/checkout@v4
    
    - name: 设置Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: 安装pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: 安装依赖
      run: pnpm install
    
    - name: 生成Prisma客户端
      run: pnpm run db:generate
    
    - name: 构建Next.js
      run: pnpm run build
    
    - name: 打包Windows可执行文件
      run: pnpm exec electron-builder --win --x64
    
    - name: 上传安装包
      uses: actions/upload-artifact@v4
      with:
        name: windows-installer
        path: dist-electron/*.exe
```

### 步骤3：触发构建

1. 推送代码后，GitHub Actions自动运行
2. 或在GitHub网页上手动触发：
   - 进入仓库 → Actions → Build Windows Executable → Run workflow

### 步骤4：下载安装包

构建完成后（约5-10分钟）：
1. 进入 Actions → 最新的workflow
2. 下载 Artifacts → windows-installer
3. 解压得到 `.exe` 文件

**优点**：
- ✅ 完全免费
- ✅ 真实的Windows环境
- ✅ 可重复使用
- ✅ 自动化构建

**缺点**：
- ⚠️ 需要GitHub账号
- ⚠️ 首次设置需要10分钟

---

## ☁️ 方案2：使用云端Windows（快速）

### 选项A：Microsoft Azure（免费试用）

1. 注册Azure账号（200美元免费额度）
2. 创建Windows虚拟机
3. 远程桌面连接
4. 在虚拟机中打包

### 选项B：AWS WorkSpaces（按小时付费）

1. 注册AWS账号
2. 创建WorkSpace（Windows桌面）
3. 连接并打包
4. 用完删除（约$0.5/小时）

### 选项C：Parallels Desktop（试用版）

```bash
# 下载Parallels试用版（14天免费）
# https://www.parallels.com/

# 安装Windows 10/11（可用开发者版本）
# 在虚拟机中打包
```

---

## 🔧 方案3：临时解决方案（立即可用）

**如果只是测试或内部使用，可以先发开发版**

### 创建便携启动包

```bash
# 1. 创建发布目录
mkdir release-portable
cd release-portable

# 2. 复制必要文件
cp -r ../.next .
cp -r ../public .
cp -r ../prisma .
cp -r ../data .
cp ../electron-main.js .
cp ../package.json .
cp -r ../node_modules .  # 注意：这会很大

# 3. 创建README
cat > README.txt << 'EOF'
森源管理系统 - 便携版

安装步骤：
1. 确保已安装 Node.js 18+
2. 打开命令行，进入此目录
3. 运行: npm run electron

首次运行需要初始化数据库，请稍等片刻。
EOF

# 4. 压缩打包
cd ..
zip -r 森源管理系统-便携版.zip release-portable
```

发给Windows用户后，他们只需：
```cmd
npm install -g pnpm
pnpm run electron
```

---

## 📦 方案4：使用Docker + Wine（实验性）

**不推荐，可能有问题**

```bash
# 使用electron-builder的Docker镜像
docker run --rm -ti \
  -v $(pwd):/project \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && pnpm install && pnpm run build && pnpm exec electron-builder --win"
```

---

## 🎬 推荐流程（最快方案）

### 5分钟快速方案：GitHub Actions

1. **创建配置文件**（下面会自动创建）
2. **推送到GitHub**
   ```bash
   git add .
   git commit -m "Add Windows build workflow"
   git push
   ```
3. **等待构建**（5-10分钟）
4. **下载exe文件**

### 如果GitHub不可行：云端Windows

1. **Azure免费试用**（最推荐）
   - 200美元额度
   - 足够用几个月
   
2. **创建Windows VM**
   - 选择 Windows 10/11
   - 最小配置即可
   
3. **远程连接打包**
   - 用Remote Desktop连接
   - 运行打包脚本

---

## 💡 我的建议

**如果项目会长期维护**：
→ 使用 **GitHub Actions**（一劳永逸）

**如果只需要打包一次**：
→ 使用 **Azure免费试用**（最快速）

**如果仅供内部测试**：
→ 发送 **便携版**（最简单）

---

## 注意事项

### GitHub Actions限制
- 每月2000分钟免费（公开仓库无限）
- 每次构建约10分钟
- 可以构建200次/月

### 云端Windows成本
- Azure：免费试用200美元
- AWS：约$0.5/小时，用完即删
- 打包仅需30分钟，成本<$1

### 便携版限制
- ❌ 需要用户安装Node.js
- ❌ 文件体积较大（含node_modules）
- ❌ 不够专业
- ✅ 但可以立即使用

---

接下来我会为您创建GitHub Actions配置文件。

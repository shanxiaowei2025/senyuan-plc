# 森源管理系统 - Windows打包完整指南

## 📖 文档导航

根据您的情况，选择对应的指南：

### 🎯 快速方案（推荐）

| 文档 | 适用场景 | 时间 | 难度 |
|------|----------|------|------|
| **快速开始-GitHub打包.md** | ⭐ 只有Mac，想自动打包 | 10分钟 | ⭐⭐ |
| **GitHub-Actions使用指南.md** | 详细的GitHub Actions教程 | 15分钟 | ⭐⭐ |
| **Mac电脑打包Windows方案.md** | Mac上的所有可行方案对比 | - | ⭐ |

### 🔧 其他方案

| 文档 | 适用场景 | 时间 | 难度 |
|------|----------|------|------|
| **Windows打包方案.md** | 有Windows电脑 | 15分钟 | ⭐ |
| **scripts/build-desktop.bat** | 在Windows上一键打包 | 15分钟 | ⭐ |

### 📝 技术文档

| 文档 | 说明 |
|------|------|
| **打包问题总结.md** | 详细的问题分析和排查 |
| **修复说明.md** | 技术修复过程 |
| **CHANGELOG.md** | 版本更新日志 |

---

## 🚀 立即开始

### 情况1：只有Mac电脑（您的情况）

**推荐方案：GitHub Actions自动打包**

```bash
# 1. 推送代码到GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/manage.git
git push -u origin main

# 2. 在GitHub网页上
# Actions → Build Windows Executable → Run workflow

# 3. 等待5-10分钟

# 4. 下载exe文件
# Actions → 最新构建 → Artifacts → 下载
```

**详细步骤**：阅读 `快速开始-GitHub打包.md`

---

### 情况2：有Windows电脑

```cmd
# 在Windows上运行
双击 scripts\build-desktop.bat
```

**详细步骤**：阅读 `Windows打包方案.md`

---

## 📦 打包后的文件

成功后会得到：
- `森源管理系统-0.1.0-x64.exe` (约130MB)

这是一个完整的Windows安装包，包含：
- ✅ Next.js应用
- ✅ Electron桌面框架
- ✅ 所有运行时依赖
- ✅ SQLite数据库
- ✅ 安装向导

---

## 🎯 推荐流程

### 最快方案（Mac用户）

1. **阅读**：`快速开始-GitHub打包.md`（5分钟）
2. **操作**：推送代码到GitHub（3分钟）
3. **等待**：GitHub自动构建（10分钟）
4. **下载**：获取exe文件（1分钟）

**总耗时**：约20分钟（其中10分钟是自动构建，可以去喝杯咖啡）

### 最可靠方案（如有Windows）

1. **传输**：将项目复制到Windows电脑
2. **运行**：双击 `scripts/build-desktop.bat`
3. **等待**：自动安装依赖并打包（15分钟）
4. **完成**：在 `dist-electron` 找到exe

---

## ⚡ 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **GitHub Actions** | 免费、自动、Mac可用 | 需要GitHub、首次配置 | ⭐⭐⭐⭐⭐ |
| **Windows本地打包** | 100%兼容、可测试 | 需要Windows电脑 | ⭐⭐⭐⭐ |
| **云端Windows** | 快速、按需使用 | 需要付费/试用 | ⭐⭐⭐ |
| **虚拟机** | 一次配置永久使用 | 占用资源、需购买 | ⭐⭐ |

---

## 🆘 遇到问题？

### 问题：模块找不到错误

**现象**：启动时报错 `Cannot find module '@swc/helpers'`

**原因**：macOS上跨平台打包的符号链接问题

**解决**：使用GitHub Actions或Windows本地打包

**详细说明**：阅读 `打包问题总结.md`

---

### 问题：GitHub Actions构建失败

**查看日志**：
1. 进入失败的构建
2. 点击红叉的步骤
3. 查看错误信息

**常见问题**：
- 网络问题 → 重试
- 代码错误 → 检查本地是否能 `pnpm run build`
- 配置错误 → 检查 `.github/workflows/build-windows.yml`

---

### 问题：exe文件无法运行

**可能原因**：
1. Windows版本太旧（需要Win10+）
2. 缺少运行时（已包含，应该不会）
3. 杀毒软件拦截（添加信任）

**解决**：
- 右键 → 属性 → 解除锁定
- 以管理员身份运行
- 临时关闭杀毒软件

---

## 📚 技术栈

- **前端框架**：Next.js 15.3.5
- **桌面框架**：Electron 28.3.3
- **数据库**：SQLite + Prisma
- **UI组件**：Radix UI + TailwindCSS
- **打包工具**：electron-builder

---

## 🔗 相关链接

- [GitHub Actions文档](https://docs.github.com/actions)
- [Electron Builder文档](https://www.electron.build/)
- [Next.js文档](https://nextjs.org/docs)

---

## 📞 技术支持

如遇到其他问题：
1. 查看 `打包问题总结.md`
2. 查看GitHub Actions日志
3. 检查本地能否正常运行：`pnpm run dev`

---

## ✅ 快速检查清单

打包前确认：
- [ ] 代码可以本地运行（`pnpm run dev`）
- [ ] 已安装所有依赖（`pnpm install`）
- [ ] Prisma已生成（`pnpm run db:generate`）
- [ ] Next.js可以构建（`pnpm run build`）

GitHub Actions：
- [ ] 代码已推送到GitHub
- [ ] Actions已启用
- [ ] 工作流配置文件存在
- [ ] 手动触发或推送触发

下载后：
- [ ] 解压ZIP文件
- [ ] 找到exe文件
- [ ] 文件大小约130MB
- [ ] 可以正常安装

---

**🎉 祝您打包顺利！GitHub Actions是Mac用户的最佳选择！**

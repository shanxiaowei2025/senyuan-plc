# 🚀 5分钟快速开始 - GitHub自动打包

## 目标
在Mac上通过GitHub Actions自动打包Windows可执行文件

## 前提条件
- ✅ 有GitHub账号（没有？点击 https://github.com/signup 注册）
- ✅ 已安装Git（检查：`git --version`）

---

## 第一步：推送代码到GitHub（3分钟）

### 1. 打开终端，进入项目目录
```bash
cd /Users/liangbaikai/Desktop/工作/manage
```

### 2. 初始化Git（如果还没有）
```bash
# 检查是否已初始化
git status

# 如果报错"not a git repository"，执行：
git init
git add .
git commit -m "Initial commit"
```

### 3. 创建GitHub仓库

访问：https://github.com/new

填写：
- Repository name: `manage` 或 `senyuan-manage`
- Description: `森源管理系统`
- 选择: **Private**（私有）
- **不要勾选**任何初始化选项
- 点击 **Create repository**

### 4. 推送代码
```bash
# 复制GitHub给你的命令，类似：
git remote add origin https://github.com/你的用户名/manage.git
git branch -M main
git push -u origin main
```

---

## 第二步：触发自动构建（1分钟）

### 1. 在GitHub仓库页面

点击上方的 **Actions** 标签

### 2. 启用Actions（如果需要）

如果看到"Workflows disabled"：
- 点击 **I understand my workflows, go ahead and enable them**

### 3. 手动触发构建

- 左侧选择 **Build Windows Executable**
- 右上角点击 **Run workflow** 下拉按钮
- 点击绿色的 **Run workflow** 按钮

---

## 第三步：等待并下载（5-10分钟）

### 1. 等待构建完成

- 刷新页面，看到黄色圆点 🟡 表示正在构建
- 变成绿色打勾 ✅ 表示构建成功
- 变成红色叉叉 ❌ 表示构建失败（查看日志）

### 2. 下载exe文件

构建成功后：
1. 点击进入该次构建
2. 滚动到页面底部
3. 在 **Artifacts** 区域
4. 点击 **森源管理系统-Windows-Installer** 下载
5. 解压ZIP文件
6. 得到 `森源管理系统-0.1.0-x64.exe`

---

## ✅ 完成！

现在您有了Windows安装包，可以：
- 传给Windows用户安装
- 在Windows虚拟机中测试
- 分发给客户使用

---

## 📝 后续使用

### 每次代码修改后：

```bash
git add .
git commit -m "描述你的修改"
git push
```

推送后会**自动构建**，5-10分钟后下载新的exe即可。

### 手动触发构建：

1. 进入GitHub仓库
2. Actions → Build Windows Executable
3. Run workflow

---

## 🆘 遇到问题？

### 问题1：git push被拒绝

**可能原因**：GitHub需要认证

**解决方案**：
```bash
# 使用Personal Access Token
# 1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
# 2. 勾选repo权限
# 3. 复制token
# 4. 推送时输入token作为密码
```

### 问题2：Actions构建失败

**查看错误日志**：
1. 点击失败的构建
2. 点击红叉的步骤
3. 查看详细错误

**常见错误**：
- 依赖安装失败 → 检查网络，重试
- 构建失败 → 检查代码是否有错误

### 问题3：找不到Artifacts

**原因**：构建失败或未完成

**解决**：等待构建完成，确保显示绿色✅

---

## 💡 提示

### 节省时间
- 第一次构建最慢（8-10分钟）
- 后续构建有缓存（3-5分钟）

### 节省配额
- 公开仓库：无限免费
- 私有仓库：每月2000分钟（约200次构建）

### 自动化
- 推送代码自动构建
- 无需手动干预
- 每次都是全新的Windows环境

---

## 📚 相关文档

- `GitHub-Actions使用指南.md` - 详细说明
- `Mac电脑打包Windows方案.md` - 其他方案对比
- `.github/workflows/build-windows.yml` - 配置文件

---

**🎉 现在开始吧！整个过程不超过10分钟！**

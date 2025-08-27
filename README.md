# 森源管理系统

基于 Next.js + TypeScript + Prisma + modbus-serial 的现代化管理系统，集成工业PLC通信功能。

## 🚀 技术栈

- **前端框架**: Next.js 15 (App Router)
- **开发语言**: TypeScript
- **样式框架**: Tailwind CSS
- **数据库 ORM**: Prisma
- **数据库**: SQLite (开发环境)
- **工业通信**: modbus-serial
- **UI 组件**: Radix UI + 自定义组件
- **图标**: Lucide React
- **包管理器**: pnpm

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   │   ├── health/        # 健康检查
│   │   ├── users/         # 用户管理 API
│   │   ├── plc/           # PLC通信 API
│   │   │   ├── connect/   # PLC连接管理
│   │   │   ├── float32/   # 32位浮点数处理
│   │   │   ├── coils/     # 线圈读写操作
│   │   │   ├── registers/ # 寄存器读写操作
│   │   │   └── ws/        # WebSocket通信
│   │   └── devices/       # 设备管理 API
│   ├── dashboard/         # 仪表板页面
│   ├── users/             # 用户管理页面
│   ├── devices/           # 设备管理页面与PLC通信
│   ├── products/          # 产品管理页面
│   ├── logistics/         # 物流管理页面
│   ├── logs/              # 系统日志页面
│   ├── settings/          # 系统设置页面
│   ├── error.tsx          # 错误处理页面
│   ├── loading.tsx        # 加载页面
│   ├── not-found.tsx      # 404 页面
│   └── page.tsx           # 首页（重定向到仪表板）
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   │   ├── button.tsx    # 按钮组件
│   │   ├── input.tsx     # 输入框组件
│   │   └── card.tsx      # 卡片组件
│   └── layout/           # 布局组件
│       ├── main-layout.tsx # 主布局
│       ├── navbar.tsx    # 导航栏
│       └── sidebar.tsx   # 侧边栏
├── lib/                  # 工具库
│   ├── prisma.ts         # Prisma 客户端
│   ├── plc-service.ts    # PLC 通信服务
│   ├── plc-context.tsx   # PLC 状态上下文
│   ├── use-plc-websocket.ts # PLC WebSocket钩子
│   └── utils.ts          # 工具函数
└── ...
prisma/
├── schema.prisma         # 数据库模型定义
└── seed.ts              # 数据库种子脚本
data/
└── measure-positions.json # 钢筋测量位置配置
PLC_RULES.md              # PLC控制规则详细文档
PROJECT_SUMMARY.md        # 项目总结文档
```

## 🛠️ 开发环境设置

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境变量配置

复制 `.env.example` 到 `.env` 并配置数据库连接：

```env
DATABASE_URL="file:./dev.db"
# 可选PLC默认配置
PLC_HOST="192.168.55.199"
PLC_PORT="502"
PLC_UNIT_ID="1"
```

### 3. 数据库初始化

npx prisma db push

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 推送数据库架构
pnpm db:push

# 初始化测试数据
pnpm db:seed
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3001](http://localhost:3001) 查看应用。

## 📊 功能特性

### 已实现功能

- ✅ 响应式布局设计
- ✅ 用户管理系统
- ✅ 仪表板统计
- ✅ 数据库集成
- ✅ API 路由
- ✅ 类型安全
- ✅ 设备管理页面
- ✅ PLC Modbus通信
- ✅ 32位浮点寄存器读写
- ✅ 线圈状态读写
- ✅ PLC心跳功能 (M4005)
- ✅ 产品管理页面
- ✅ 物流管理页面
- ✅ 系统日志页面
- ✅ 系统设置页面
- ✅ 错误处理页面
- ✅ 404 页面
- ✅ 加载页面

### 待实现功能

- 🔄 用户认证系统
- 🔄 权限管理
- 🔄 文件上传
- 🔄 数据导出
- 🔄 数据可视化图表
- 🔄 实时通知系统
- 🔄 移动端适配优化
- 🔄 更多寄存器类型支持
- 🔄 PLC数据历史存储

## 👥 默认用户

系统初始化后会自动创建以下测试用户：

| 邮箱 | 密码 | 角色 | 部门 |
|------|------|------|------|
| admin@senyuan.com | Admin123! | 管理员 | 技术部 |
| zhangsan@senyuan.com | User123! | 用户 | 销售部 |
| lisi@senyuan.com | User123! | 用户 | 财务部 |
| wangwu@senyuan.com | User123! | 经理 | 人事部 |

## 🎨 组件系统

### UI 组件

项目使用基于 Radix UI 的自定义组件系统：

- `Button` - 按钮组件，支持多种变体
- `Input` - 输入框组件
- `Card` - 卡片容器组件
- `Dialog` - 对话框组件

### 布局组件

- `MainLayout` - 主布局组件
- `Navbar` - 导航栏组件
- `Sidebar` - 侧边栏组件

## 🔧 开发命令

```bash
# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# 数据库相关
pnpm db:generate    # 生成 Prisma 客户端
pnpm db:push        # 推送数据库架构
pnpm db:seed        # 初始化测试数据

npx prisma studio  # 查看数据库
```

## 📝 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名

### 组件开发

- 使用函数组件和 Hooks
- 优先使用 TypeScript 接口定义 props
- 组件文件包含类型定义和导出
- 使用 JSDoc 注释关键函数

### 数据库操作

- 使用 Prisma 进行所有数据库操作
- 在 API 路由中处理数据库逻辑
- 使用事务确保数据一致性
- 实现适当的错误处理

### PLC通信

- 使用 modbus-serial 库进行 Modbus TCP 通信
- 支持多种寄存器类型的读写操作
- 32位浮点数使用大端序转换
- 实现自动重连和错误处理机制
- 通信日志详细记录
- **详细的PLC控制规则请参考 [`PLC_RULES.md`](./PLC_RULES.md) 文档**

#### PLC心跳功能
- **功能**: 当PLC连接成功后，系统每秒向M4005地址写入ON状态
- **目的**: 保持与PLC的通信活跃，确保连接稳定性
- **状态显示**: 在设备页面可实时查看心跳状态
  - ❤️ 心跳活跃 - 正在向M4005写入ON
  - 心跳停止 - 心跳功能未运行
- **自动管理**: 
  - PLC连接成功时自动启动心跳
  - PLC断开连接时自动停止心跳
  - 监控服务停止时自动停止心跳

#### PLC核心业务规则
系统实现了三条核心的PLC控制规则，实现生产过程的自动化控制：

1. **规则1 - 步料台大臂伸出至测量位** (M4000触发)
   - 自动计算最佳钢筋测量位置
   - 基于钢筋圈半径和直径参数进行智能选择

2. **规则2 - 北向服定位位置** (M4001触发)
   - 根据M4003/M4004状态执行不同定位逻辑
   - 支持简单直接写入和复杂计算两种模式

3. **规则3 - 数据采集和数据库写入** (M4002触发)
   - 采集多个寄存器数据并计算钢筋实际长度
   - 自动将生产数据写入数据库进行记录

> 📖 **详细的规则说明、执行流程和寄存器映射请查看 [`PLC_RULES.md`](./PLC_RULES.md) 文档**

## 🚀 部署

### Vercel 部署

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 自托管部署

1. 构建项目：`pnpm build`
2. 启动服务器：`pnpm start`
3. 配置反向代理（如 Nginx）

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：admin@senyuan.com
- 项目地址：[GitHub Repository]

---

**森源管理系统** - 让管理更简单，让工作更高效！

# ExportCRM - 外贸出口客户关系管理系统

ExportCRM 是一个现代化的外贸出口客户关系管理系统，专为金属加工品出口企业设计。系统基于 Next.js 15 + PocketBase 技术栈构建，支持中英文双语界面。

## 核心业务流程

```
客户需求 → 供应商询价(RFQ) → 成本收集 → 客户报价(Quotation) → 订单确认(Order) → 形式发票(PI) → 采购订单(PO) → 发货(Shipment) → 报关(Customs) → 商业发票(CI)
```

## 功能特性

### 核心模块
- 🏢 **客户管理** - 客户信息、联系人、双语支持
- 🏭 **供应商管理** - 供应商信息、银行账户、资质证书
- 📦 **产品管理** - 产品目录、规格、模具、文档
- 📋 **项目管理** - 项目全生命周期、多订单支持

### 业务流程
- 📝 **询价管理 (RFQ)** - 供应商询价、报价比较、成本分析
- 💰 **报价管理** - 客户报价、利润率计算、Incoterm 费用
- 📄 **订单管理** - 销售订单、状态流转、收款管理
- 🛒 **采购订单** - 供应商采购、付款管理

### 物流财务
- 🚢 **发货管理** - 发货批次、运输跟踪
- 🛃 **报关管理** - 报关流程、费用记录
- 💵 **财务管理** - 收款、付款、汇率转换
- 📑 **发票管理** - PI/CI 生成、版本管理

### 辅助功能
- 📊 **仪表板** - KPI 统计、汇率卡片
- ✅ **任务管理** - 待办事项、截止日期
- 📁 **文件管理** - S3 存储、文档分类
- ⚙️ **系统配置** - 公司信息、基础数据

## 技术特性

- 🔐 **用户认证** - 完整的登录、注册、权限管理
- 🌐 **国际化** - 中英文双语界面
- 📊 **数据表格** - 搜索、排序、分页、导入导出
- 📁 **文件管理** - S3 兼容存储
- 🎨 **现代 UI** - shadcn/ui 组件库
- 🌙 **深色模式** - 主题切换支持
- 📱 **响应式** - 移动端适配

## 快速开始

### 1. 安装依赖

```bash
cd exportcrm
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置必要的环境变量。

### 3. 启动 PocketBase 和 MinIO

```bash
docker-compose up -d
```

这会启动：
- PocketBase: http://localhost:8092
- MinIO: http://localhost:9003 (API) / http://localhost:9004 (控制台)

首次启动后，创建 PocketBase 超级用户：

```bash
docker exec -it exportcrm_pocketbase /usr/local/bin/pocketbase superuser create your@email.com yourpassword
```

创建 MinIO bucket：

```bash
docker exec exportcrm_minio mc mb /data/exportcrm-documents
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 环境变量

### PocketBase 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_POCKETBASE_URL` | PocketBase 服务器地址 | `http://localhost:8092` |

### S3 存储配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `S3_ENDPOINT` | S3 端点 URL | `http://localhost:9003` |
| `S3_REGION` | AWS 区域 | `us-east-1` |
| `S3_ACCESS_KEY` | 访问密钥 ID | `minioadmin` |
| `S3_SECRET_KEY` | 访问密钥 | `minioadmin123` |
| `S3_BUCKET` | 默认存储桶 | `exportcrm-documents` |
| `S3_FORCE_PATH_STYLE` | 使用路径风格 URL | `true` |

### 汇率 API 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `EXCHANGE_RATE_PROVIDER` | 汇率 API 提供商 | `exchangerate-api` |
| `EXCHANGE_RATE_API_KEY` | API 密钥（如需要） | - |
| `EXCHANGE_RATE_BASE_CURRENCY` | 基准货币 | `USD` |

### AI 配置（可选）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_ENABLED` | 启用 AI 功能 | `false` |
| `AI_PROVIDER` | AI 提供商 | - |
| `AI_API_KEY` | AI API 密钥 | - |
| `AI_MODEL` | AI 模型名称 | - |

## 目录结构

```
exportcrm/
├── app/                        # Next.js App Router
│   ├── (authenticated)/        # 需要登录的页面
│   │   ├── dashboard/          # 仪表板
│   │   ├── customers/          # 客户管理
│   │   ├── suppliers/          # 供应商管理
│   │   ├── products/           # 产品管理
│   │   ├── projects/           # 项目管理
│   │   ├── rfqs/               # 询价管理
│   │   ├── quotations/         # 报价管理
│   │   ├── orders/             # 订单管理
│   │   ├── purchase-orders/    # 采购订单
│   │   ├── invoices/           # 发票管理
│   │   ├── shipments/          # 发货管理
│   │   ├── tasks/              # 任务管理
│   │   ├── disk/               # 文件管理
│   │   └── settings/           # 系统设置
│   ├── (public)/               # 公开页面
│   │   ├── login/              # 登录
│   │   └── register/           # 注册
│   └── api/                    # API 路由
├── components/                 # React 组件
│   ├── customers/              # 客户相关组件
│   ├── suppliers/              # 供应商相关组件
│   ├── products/               # 产品相关组件
│   ├── data-table/             # 数据表格组件
│   ├── disk/                   # 文件管理组件
│   ├── layout/                 # 布局组件
│   └── ui/                     # shadcn/ui 组件
├── hooks/                      # React Hooks
│   └── collections/            # 数据集合 Hooks
├── lib/                        # 工具库
│   ├── pocketbase/             # PocketBase 客户端
│   │   ├── services/           # 数据服务
│   │   └── base-service.ts     # 服务基类
│   ├── s3/                     # S3 存储
│   ├── constants/              # 常量定义
│   │   ├── trade-standards.ts  # 国际贸易常量
│   │   └── storage.ts          # 存储路径常量
│   ├── services/               # 业务服务
│   │   ├── code-generator.ts   # 业务编码生成
│   │   ├── storage-path.ts     # 文档路径生成
│   │   └── quotation-calculator.ts # 报价计算
│   ├── i18n/                   # 国际化
│   └── utils.ts                # 工具函数
├── pocketbase/                 # PocketBase 配置
│   └── pb_migrations/          # 数据库迁移
├── types/                      # TypeScript 类型
├── docker-compose.yml          # Docker 配置
├── middleware.ts               # Next.js 中间件
└── .env.example                # 环境变量模板
```

## 国际贸易常量

系统内置以下国际贸易标准常量：

- **Incoterms 2020** - EXW, FOB, CIF, DDP 等贸易术语
- **集装箱类型** - 20GP, 40GP, 40HQ 等
- **计量单位** - 数量、重量、长度、体积单位
- **包装类型** - 纸箱、木托盘、木箱等
- **运输方式** - 海运、空运、陆运、快递
- **保险类型** - 基本险、附加险、特殊险

## 业务编码规范

| 实体类型 | 前缀 | 格式 | 示例 |
|---------|------|------|------|
| 客户 | C | C-YYYY-XXXX | C-2025-0001 |
| 供应商 | S | S-YYYY-XXXX | S-2025-0001 |
| 项目 | P | P-YYYY-XXXX | P-2025-0001 |
| 产品 | PRD | PRD-YYYY-XXXX | PRD-2025-0001 |
| 询价单 | RFQ | RFQ-YYYY-XXXX | RFQ-2025-0001 |
| 报价单 | Q | Q-YYYY-XXXX | Q-2025-0001 |
| 销售订单 | O | O-YYYY-XXXX | O-2025-0001 |
| 采购订单 | PO | PO-YYYY-XXXX | PO-2025-0001 |
| 形式发票 | PI | PI-YYYY-XXXX | PI-2025-0001 |
| 商业发票 | CI | CI-YYYY-XXXX | CI-2025-0001 |

## 可用脚本

```bash
# 开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 运行测试
npm run test

# 监听模式测试
npm run test:watch
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **后端**: PocketBase
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui + Radix UI
- **存储**: AWS S3 / MinIO
- **测试**: Vitest + fast-check
- **语言**: TypeScript

## 许可证

MIT

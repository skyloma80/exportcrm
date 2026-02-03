# PocketBase Setup

This directory contains the PocketBase backend configuration for the Next.js template.

## Quick Start

### Using Docker Compose (Recommended)

在项目根目录运行 Docker Compose，会同时启动 PocketBase 和 MinIO（S3 存储）：

```bash
# 在项目根目录
docker-compose up -d
```

这会启动：
- **PocketBase**: http://localhost:8090 (Admin UI: http://localhost:8090/_/)
- **MinIO S3 API**: http://localhost:9000
- **MinIO Console**: http://localhost:9001 (用户名: minioadmin, 密码: minioadmin123)

### 停止服务

```bash
docker-compose down
```

### 查看日志

```bash
docker-compose logs -f
```

## First Time Setup

1. Start PocketBase with Docker Compose
2. Create superuser (choose one method):

**方法 1: Web 界面 (推荐)**

首次启动时，查看 Docker 日志获取安装链接：
```bash
docker logs pocketbase
```

日志中会显示类似这样的安装 URL：
```
http://127.0.0.1:8090/_/#/pbinstal/{token}
```

打开该链接，按提示创建管理员账户即可。

> **注意**: 安装链接中的 token 是动态生成的，每次重置数据后都会变化。

**方法 2: 命令行 (适合自动化部署)**

```bash
# Docker
docker exec -it exportcrm_pocketbase pocketbase superuser create 271341794@qq.com Test123456


docker exec -it exportcrm_pocketbase pocketbase superuser upsert 271341794@qq.com Test123456


 
```

3. Access the admin UI at http://localhost:8090/_/#/
4. The migrations will be automatically applied on first run

## User Registration

用户通过应用注册后，需要在 Admin UI 中启用才能登录：

1. 访问 http://localhost:8090/_/#/collections?collectionId=users
2. 找到新注册的用户记录
3. 点击编辑，将 `verified` 字段设为 `true`
4. 保存

> **注意**: 如果不启用 verified，用户将无法登录（返回 "Failed to authenticate" 错误）。

如果需要自动验证用户，可以在 Admin UI 的 users Collection 设置中关闭邮箱验证要求。

## Directory Structure

```
pocketbase/
├── pb_data/          # Database and uploaded files ()
├── pb_hooks/         # Custom JavaScript hooks
├── pb_migrations/    # Database migrations
│   └── 001_create_items.js    # Sample items collection
└── README.md
```

 

## PocketBase S3 存储配置

PocketBase 和 MinIO 在同一个 Docker 网络中，配置 S3 存储时使用容器名：

1. 访问 PocketBase Admin UI: http://localhost:8090/_/
2. 进入 Settings → Files storage
3. 启用 "Use S3 storage"
4. 填写配置：

| 字段 | 值 |
|------|-----|
| Endpoint | `http://minio:9000` |
| Bucket | `documents` |
| Region | `us-east-1` |
| Access key | `minioadmin` |
| Secret | `minioadmin123` |
| Force path-style addressing | ✅ 勾选 |

5. 点击 Save

> **重要**: Endpoint 使用 `http://minio:9000`（容器名），不是 `localhost`！

### 创建 MinIO Bucket

首次使用前需要在 MinIO 中创建 bucket：

1. 访问 MinIO Console: http://localhost:9001
2. 使用 `minioadmin` / `minioadmin123` 登录
3. 点击 "Create Bucket"
4. 输入名称 `documents`，点击创建

## Collections

### users (Built-in Auth Collection)

PocketBase automatically creates a `users` auth collection on first run. **Do not create a custom users migration** - it will conflict with the built-in collection.

The built-in users collection includes:

| Field | Type | Description |
|-------|------|-------------|
| email | email | User email (required, unique) |
| password | password | User password (min 8 chars) |
| name | text | Display name (optional) |
| avatar | file | Profile picture (optional) |
| verified | bool | Email verification status |

If you need to customize the users collection, do it through the Admin UI after PocketBase starts.

### items (Demo Collection)

A sample collection for the data table demo:

| Field | Type | Description |
|-------|------|-------------|
| name | text | Item name (required) |
| description | text | Item description |
| status | select | Status: active, inactive, pending |
| created | autodate | Creation timestamp |
| updated | autodate | Last update timestamp |

## API Rules

Both collections require authentication for all operations:

- **List/View**: Authenticated users only
- **Create**: Authenticated users only
- **Update**: Authenticated users only (users can only update their own profile)
- **Delete**: Authenticated users only (users can only delete their own profile)

## Environment Variables

Make sure your Next.js app has the following environment variable set:

```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

## Migrations

Migrations are automatically applied when PocketBase starts. To create a new migration:

1. Make changes in the admin UI
2. Export the collection schema
3. Create a new migration file in `pb_migrations/`

Migration files follow the naming convention: `XXX_description.js`

## Backup

To backup your data:

```bash
# Using PocketBase CLI
./pocketbase backup

# Or simply copy the pb_data directory
cp -r pb_data pb_data_backup
```

## Troubleshooting

### Port Already in Use

If port 8090 is already in use, you can change it:

```bash
./pocketbase serve --http=127.0.0.1:8091
```

Remember to update `NEXT_PUBLIC_POCKETBASE_URL` accordingly.

### Migrations Not Applied

If migrations are not being applied:

1. Check the migration file syntax
2. Ensure the file has the `.js` extension
3. Check PocketBase logs for errors

### CORS Issues

PocketBase allows all origins by default in development. For production, configure CORS in the admin settings.

## Resources

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase GitHub](https://github.com/pocketbase/pocketbase)
- [PocketBase JavaScript SDK](https://github.com/pocketbase/js-sdk)

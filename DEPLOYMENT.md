# ExportCRM 部署文档

## 目录
- [架构概览](#架构概览)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [常见问题](#常见问题)

---

## 架构概览

生产环境包含三个 Docker 容器：

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| Next.js | exportcrm_nextjs | 3333:3333 | 前端应用 |
| PocketBase | exportcrm_pocketbase | 8091:8090 | 数据库（避开 1Panel 的 8090） |
| MinIO | exportcrm_minio | 9000/9001 | S3 兼容对象存储 |

所有服务通过 `exportcrm-network` Docker 网络互联。

---

## 本地开发

### 环境要求
- Node.js 22+
- Docker Desktop
- PowerShell

### 启动开发环境

```bash
cd exportcrm
yarn install
yarn dev
```

---

## 生产部署

### 方式一：一键部署（推荐）

```powershell
cd exportcrm
.\deploy.ps1
```

此脚本会自动：
1. 构建 Docker 镜像
2. 导出为 tar 文件
3. 上传到服务器
4. 启动容器

### 方式二：手动部署

#### 步骤 1：本地构建镜像

```powershell
cd exportcrm

# 构建镜像
.\docker-build.ps1 build

# 导出镜像
.\docker-build.ps1 export
```

#### 步骤 2：上传文件到服务器

```powershell
# 上传镜像
scp crm.tar ubuntu@42.194.150.84:/home/ubuntu/crm/

# 上传配置文件
scp docker-compose.yml ubuntu@42.194.150.84:/home/ubuntu/crm/
scp .env.production ubuntu@42.194.150.84:/home/ubuntu/crm/
```

#### 步骤 3：服务器部署

SSH 登录服务器后执行：

```bash
cd /home/ubuntu/crm

# 创建数据目录
mkdir -p pocketbase/pb_data pocketbase/pb_migrations pocketbase/pb_hooks

# 加载镜像
docker load -i crm.tar

# 启动所有服务
docker-compose up -d

# 开放防火墙端口
sudo ufw allow 3333/tcp   # Next.js
sudo ufw allow 8091/tcp   # PocketBase
sudo ufw allow 9000/tcp   # MinIO S3 API
sudo ufw allow 9001/tcp   # MinIO 控制台
```

---

## 配置文件

### .env.production

```env
NODE_ENV=production

# PocketBase - 浏览器访问地址（必须用外部 IP）
NEXT_PUBLIC_POCKETBASE_URL=http://42.194.150.84:8091
NEXT_PUBLIC_USE_POCKETBASE=true
USE_POCKETBASE=true
DATABASE_PROVIDER=pocketbase

# MinIO - 服务端访问地址（Docker 内部网络）
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=exportcrm
S3_SECRET_KEY=exportcrm2025
S3_BUCKET=documents
S3_FORCE_PATH_STYLE=true
```

**重要说明：**
- `NEXT_PUBLIC_` 前缀的变量会编译到前端 JS，浏览器需要能访问到
- 浏览器无法访问 Docker 内部地址（如 `pocketbase:8090`），必须用外部 IP
- 服务端变量（如 `S3_ENDPOINT`）可以用 Docker 内部网络地址

### docker-compose.yml

```yaml
services:
  nextjs:
    image: crm:latest
    container_name: exportcrm_nextjs
    restart: unless-stopped
    ports:
      - "3333:3333"
    env_file:
      - .env.production
    depends_on:
      pocketbase:
        condition: service_healthy
    networks:
      - exportcrm-network

  pocketbase:
    image: ghcr.io/muchobien/pocketbase:0.35.0
    container_name: exportcrm_pocketbase
    restart: unless-stopped
    ports:
      - "8091:8090"
    volumes:
      - ./pocketbase/pb_data:/pb_data
      - ./pocketbase/pb_migrations:/pb_migrations
      - ./pocketbase/pb_hooks:/pb_hooks
    networks:
      - exportcrm-network

  minio:
    image: minio/minio:latest
    container_name: exportcrm_minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: exportcrm
      MINIO_ROOT_PASSWORD: exportcrm2025
    volumes:
      - exportcrm_minio_data:/data
    command: server /data --console-address ":9001"
    networks:
      - exportcrm-network

networks:
  exportcrm-network:
    driver: bridge

volumes:
  exportcrm_minio_data:
```

---

## MinIO 配置

### 设置 Bucket 公开访问

邮件中的 Logo 图片需要公开访问，需要设置 MinIO bucket 的访问策略。

#### 方法：使用 mc 命令行工具

```bash
# 在服务器上执行（不进入容器）
docker exec exportcrm_minio mc alias set local http://localhost:9000 exportcrm exportcrm2025

# 设置 public bucket 为公开下载
docker exec exportcrm_minio mc anonymous set download local/public
```

执行成功后，`http://42.194.150.84:9000/public/` 下的文件可以公开访问。

#### 公开访问 URL 格式

```
http://42.194.150.84:9000/public/<文件路径>
```

例如：`http://42.194.150.84:9000/public/logo/logo.png`

---

## 访问地址

部署完成后：

| 服务 | 地址 |
|------|------|
| Next.js 应用 | http://42.194.150.84:3333 |
| PocketBase 管理 | http://42.194.150.84:8091/_/ |
| MinIO 控制台 | http://42.194.150.84:9001 |

---

## 常见问题

### 1. 端口冲突

服务器上 1Panel 占用了 8090 端口，所以 PocketBase 改用 8091。

### 2. PocketBase 连接失败

检查 `NEXT_PUBLIC_POCKETBASE_URL` 是否使用了外部 IP 地址。

```bash
# 检查 PocketBase 是否运行
docker ps | grep pocketbase

# 测试连接
curl http://42.194.150.84:8091/api/health

在exportcrm_pocketbase容器的终端 执行 
 pocketbase superuser create 271341794@qq.com 08065711jern

```




### 3. 更新部署

```bash
cd /home/ubuntu/crm

# 停止服务
docker-compose down

# 加载新镜像
docker load -i crm.tar

# 重新启动
docker-compose up -d
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看单个服务日志
docker logs -f exportcrm_nextjs
docker logs -f exportcrm_pocketbase
docker logs -f exportcrm_minio
```

---

## 服务器信息

- IP: 42.194.150.84
- 用户: ubuntu
- 项目目录: /home/ubuntu/crm

---

**最后更新：** 2025-12-30

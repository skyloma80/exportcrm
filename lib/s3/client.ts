/**
 * S3 客户端配置
 * 
 * 支持 MinIO（本地开发）和云 S3 服务（生产环境）
 */

import { S3Client } from '@aws-sdk/client-s3';

// S3 内部端点（服务器端使用，Docker 网络内部）
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';

// S3 公开端点（客户端使用，浏览器可访问）
// 如果未设置，则使用内部端点（本地开发时两者相同）
export const S3_PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT || S3_ENDPOINT;

// S3 配置
const S3_CONFIG = {
  endpoint: S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    // In production you should always set these via env.
    // For local MinIO via docker-compose.yml, defaults are exportcrm/exportcrm2025.
    accessKeyId: process.env.S3_ACCESS_KEY || 'exportcrm',
    secretAccessKey: process.env.S3_SECRET_KEY || 'exportcrm2025',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // MinIO 需要 true
};

// 默认 bucket
// Bucket must exist in your S3/MinIO instance. For this project we default to exportcrm-documents.
export const DEFAULT_BUCKET = process.env.S3_BUCKET || 'exportcrm-documents';

// 创建 S3 客户端（单例）
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(S3_CONFIG);
  }
  return s3Client;
}

// 导出配置供其他模块使用
export { S3_CONFIG };

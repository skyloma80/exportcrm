/**
 * S3 存储操作封装
 *
 * 提供类似 Supabase Storage 的 API
 * 所有文件操作通过 Next.js API 代理，不使用 presigned URL
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getS3Client, DEFAULT_BUCKET, S3_PUBLIC_ENDPOINT } from './client';

export interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
  metadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  delimiter?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  isFolder: boolean;
}

/**
 * S3 存储类
 */
export class S3Storage {
  private bucket: string;

  constructor(bucket: string = DEFAULT_BUCKET) {
    this.bucket = bucket;
  }

  /**
   * 上传文件
   */
  async upload(
    path: string,
    file: Buffer | Blob | ReadableStream,
    options: UploadOptions = {}
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    try {
      const s3 = getS3Client();
      
      let body: Buffer | ReadableStream;
      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        body = Buffer.from(arrayBuffer);
      } else {
        body = file;
      }

      console.log('S3 upload - Bucket:', this.bucket, 'Key:', path, 'ContentType:', options.contentType);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: path,
        Body: body,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      });

      await s3.send(command);
      console.log('S3 upload success:', path);
      return { data: { path }, error: null };
    } catch (error) {
      console.error('S3 upload error:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * 下载文件
   */
  async download(path: string): Promise<{ data: Blob | null; error: Error | null }> {
    try {
      const s3 = getS3Client();
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await s3.send(command);
      
      if (!response.Body) {
        return { data: null, error: new Error('Empty response body') };
      }

      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const blob = new Blob([buffer], { type: response.ContentType });
      
      return { data: blob, error: null };
    } catch (error) {
      console.error('S3 download error:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * 删除文件
   */
  async remove(paths: string | string[]): Promise<{ error: Error | null }> {
    try {
      const s3 = getS3Client();
      const pathList = Array.isArray(paths) ? paths : [paths];

      for (const path of pathList) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: path,
        });
        await s3.send(command);
      }

      return { error: null };
    } catch (error) {
      console.error('S3 remove error:', error);
      return { error: error as Error };
    }
  }

  /**
   * 列出文件
   */
  async list(options: ListOptions = {}): Promise<{ data: FileInfo[]; error: Error | null }> {
    try {
      const s3 = getS3Client();
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options.prefix || '',
        MaxKeys: options.maxKeys || 1000,
        Delimiter: options.delimiter !== undefined ? options.delimiter : '/',
      });

      const response = await s3.send(command);
      const files: FileInfo[] = [];

      // 处理文件夹（CommonPrefixes）
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const name = prefix.Prefix.replace(options.prefix || '', '').replace(/\/$/, '');
            if (name) {
              files.push({
                name,
                path: prefix.Prefix,
                size: 0,
                lastModified: new Date(),
                isFolder: true,
              });
            }
          }
        }
      }

      // 处理文件
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key && item.Key !== options.prefix) {
            const name = item.Key.replace(options.prefix || '', '');
            // 过滤 .keep 文件和所有以 . 开头的隐藏文件
            if (name && !name.endsWith('.keep') && !name.startsWith('.')) {
              files.push({
                name,
                path: item.Key,
                size: item.Size || 0,
                lastModified: item.LastModified || new Date(),
                isFolder: false,
              });
            }
          }
        }
      }

      return { data: files, error: null };
    } catch (error) {
      console.error('S3 list error:', error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * 获取文件信息
   */
  async getInfo(path: string): Promise<{ data: FileInfo | null; error: Error | null }> {
    try {
      const s3 = getS3Client();
      
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response = await s3.send(command);
      const name = path.split('/').pop() || path;

      return {
        data: {
          name,
          path,
          size: response.ContentLength || 0,
          lastModified: response.LastModified || new Date(),
          contentType: response.ContentType,
          isFolder: false,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * 创建文件夹（通过创建空的 .keep 文件）
   */
  async createFolder(folderPath: string): Promise<{ data: { path: string } | null; error: Error | null }> {
    try {
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      const { data: existing } = await this.list({ prefix: normalizedPath, maxKeys: 1 });
      if (existing.length > 0) {
        return { data: null, error: new Error('Folder already exists') };
      }

      return await this.upload(`${normalizedPath}.keep`, Buffer.from(''), {
        contentType: 'text/plain',
      });
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * 获取公开 URL
   */
  getPublicUrl(path: string): string {
    const endpoint = S3_PUBLIC_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
    
    if (forcePathStyle) {
      return `${endpoint}/${this.bucket}/${path}`;
    } else {
      const url = new URL(endpoint);
      return `${url.protocol}//${this.bucket}.${url.host}/${path}`;
    }
  }

  /**
   * 复制文件
   */
  async copy(
    sourcePath: string,
    destPath: string
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    try {
      const s3 = getS3Client();

      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourcePath}`,
        Key: destPath,
      });

      await s3.send(command);
      return { data: { path: destPath }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * 移动文件（复制后删除原文件）
   */
  async move(
    sourcePath: string,
    destPath: string
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    const { error: copyError } = await this.copy(sourcePath, destPath);
    if (copyError) {
      return { data: null, error: copyError };
    }

    const { error: removeError } = await this.remove(sourcePath);
    if (removeError) {
      return { data: null, error: removeError };
    }

    return { data: { path: destPath }, error: null };
  }
}

/**
 * 创建存储实例
 */
export function createStorage(bucket?: string): S3Storage {
  return new S3Storage(bucket);
}

export default createStorage;

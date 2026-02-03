/**
 * PocketBase 通用服务基类
 * 
 * 提供泛型 CRUD 操作，子类只需指定 collection 名称和类型
 * 
 * 注意：API 路由中使用服务层时，需要先调用 setServerPB() 设置带认证的实例
 */

import PocketBase, { RecordModel, ListResult } from 'pocketbase';
import { getPocketBase } from './auth';

// 服务端 PocketBase 实例（带认证）- 使用 AsyncLocalStorage 避免并发问题
let serverPBInstance: PocketBase | null = null;

/**
 * 设置服务端 PocketBase 实例
 * 在 API 路由中调用，传入带认证的实例
 */
export function setServerPB(pb: PocketBase): void {
  serverPBInstance = pb;
}

/**
 * 清除服务端 PocketBase 实例
 * 请求结束后调用（可选，下次 setServerPB 会覆盖）
 */
export function clearServerPB(): void {
  serverPBInstance = null;
}

export interface QueryOptions {
  filter?: string;
  sort?: string;
  expand?: string;
  page?: number;
  perPage?: number;
}

export interface ServiceOptions {
  expand?: string;
  sort?: string;
}

export class BaseCollectionService<T extends RecordModel> {
  protected collectionName: string;
  protected defaultExpand?: string;
  protected defaultSort: string;

  constructor(collectionName: string, options?: ServiceOptions) {
    this.collectionName = collectionName;
    this.defaultExpand = options?.expand;
    this.defaultSort = options?.sort || '-id';
  }

  /** 获取 PocketBase 实例 */
  protected get pb(): PocketBase {
    // 服务端优先使用已设置的带认证实例
    if (typeof window === 'undefined' && serverPBInstance) {
      return serverPBInstance;
    }
    return getPocketBase();
  }

  /** 获取分页列表 */
  async getList(options?: QueryOptions): Promise<ListResult<T>> {
    const sortValue = options?.sort !== undefined ? options.sort : this.defaultSort;
    return this.pb.collection(this.collectionName).getList<T>(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: options?.filter,
        ...(sortValue ? { sort: sortValue } : {}),
        expand: options?.expand || this.defaultExpand,
      }
    );
  }

  /** 获取全部记录 */
  async getFullList(options?: Omit<QueryOptions, 'page' | 'perPage'>): Promise<T[]> {
    const sortValue = options?.sort !== undefined ? options.sort : this.defaultSort;
    return this.pb.collection(this.collectionName).getFullList<T>({
      filter: options?.filter,
      ...(sortValue ? { sort: sortValue } : {}),
      expand: options?.expand || this.defaultExpand,
    });
  }

  /** 获取单条记录 */
  async getOne(id: string, options?: { expand?: string }): Promise<T> {
    return this.pb.collection(this.collectionName).getOne<T>(id, {
      expand: options?.expand || this.defaultExpand,
    });
  }

  /** 按条件获取第一条记录 */
  async getFirstListItem(filter: string, options?: { expand?: string }): Promise<T | null> {
    try {
      return await this.pb.collection(this.collectionName).getFirstListItem<T>(filter, {
        expand: options?.expand || this.defaultExpand,
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /** 创建记录 */
  async create(data: Partial<T>): Promise<T> {
    return this.pb.collection(this.collectionName).create<T>(data);
  }

  /** 更新记录 */
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.pb.collection(this.collectionName).update<T>(id, data);
  }

  /** 删除记录 */
  async delete(id: string): Promise<boolean> {
    return this.pb.collection(this.collectionName).delete(id);
  }

  /** 批量删除 */
  async deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.delete(id)));
  }

  /** 检查记录是否存在 */
  async exists(filter: string): Promise<boolean> {
    const result = await this.getFirstListItem(filter);
    return result !== null;
  }

  /** 统计记录数 */
  async count(filter?: string): Promise<number> {
    const result = await this.pb.collection(this.collectionName).getList(1, 1, { filter });
    return result.totalItems;
  }
}

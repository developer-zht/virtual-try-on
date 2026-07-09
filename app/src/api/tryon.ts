import { request } from './request';
import { API } from './_configs/url';
import type { TryOnResult } from './types/tryon';

/** 创建试穿任务。后端未实现，固定 501 → 调用会抛 HttpError(501, ..., 50100) */
export function createTryOn(): Promise<void> {
  return request<void>({ url: API.tryon.create, method: 'POST' });
}

/** 获取试穿结果图（需登录） */
export function getTryOnResult(id: string): Promise<TryOnResult> {
  return request<TryOnResult>({ url: API.tryon.resultById(id), method: 'GET' });
}

import { request } from './request';
import { API } from './_configs/url';
import type { TryOnResult, TryonFullRequest } from './types/tryon';
import type { TaskCreated } from './types/tasks';

/** 创建试穿任务（经典）。后端未实现，固定 501 */
export function createTryOn(): Promise<void> {
  return request<void>({ url: API.tryon.create, method: 'POST' });
}

/** 全身多件套试穿（异步）。返回 202 任务，轮询 GET /tasks/:id 拿 tryon_result.image_url */
export function createTryOnFull(body: TryonFullRequest): Promise<TaskCreated> {
  return request<TaskCreated>({ url: API.tryon.full, method: 'POST', data: body });
}

/** 获取试穿结果图（需登录） */
export function getTryOnResult(id: string): Promise<TryOnResult> {
  return request<TryOnResult>({ url: API.tryon.resultById(id), method: 'GET' });
}

/** 用已有穿搭（推荐生成或收藏）一键全身试穿（异步） */
export function createTryOnForOutfit(
  id: string,
  body: { preserve_face?: boolean; model_name?: string } = {},
): Promise<TaskCreated> {
  return request<TaskCreated>({ url: API.tryon.outfitById(id), method: 'POST', data: body });
}

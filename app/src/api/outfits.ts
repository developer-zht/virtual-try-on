import { API } from './_configs/url';
import { request } from './request';
import type { Outfit, RecommendRequest, RecommendResult } from './types/outfits';

/** 穿搭详情：可查 generated 或 saved（需登录） */
export function getOutfits(id: string): Promise<Outfit> {
  return request<Outfit>({
    url: API.outfits.byId(id),
    method: 'GET',
  });
}

/** 生成穿搭推荐（需登录） */
export function recommendOutfits(body: RecommendRequest): Promise<RecommendResult> {
  return request<RecommendResult>({
    url: API.outfits.recommend,
    method: 'POST',
    data: body,
  });
}

import { API } from './_configs/url';
import { request } from './request';
import type { Outfit } from './types/outfits';
import type { SavedOutfitList, SaveOutfitRequest } from './types/userOutfits';

/** 保存穿搭：后端写入 status=saved，返回完整 Outfit（201） */
export function saveOutfit(body: SaveOutfitRequest): Promise<Outfit> {
  return request<Outfit>({ url: API.user.outfits, method: 'POST', data: body });
}

/** 收藏穿搭列表 */
export function listSavedOutfits(): Promise<SavedOutfitList> {
  return request<SavedOutfitList>({ url: API.user.outfits, method: 'GET' });
}

/** 删除收藏穿搭（只允许删 status=saved）。成功无 data */
export function deleteSavedOutfit(id: string): Promise<void> {
  return request<void>({
    url: API.user.outfitById(id),
    method: 'DELETE',
  });
}

/** 获取今日穿搭 */
export function getTodayOutfit(): Promise<Outfit> {
  return request<Outfit>({ url: API.user.todayOutfit, method: 'GET' });
}

/** 设置今日穿搭（当前要求目标 outfit 是 status=generated） */
export function setTodayOutfit(outfitId: string): Promise<{ updated: boolean }> {
  return request<{ updated: boolean }>({
    url: API.user.todayOutfit,
    method: 'PUT',
    data: { outfit_id: outfitId },
  });
}

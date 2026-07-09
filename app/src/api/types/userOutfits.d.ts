/**
 * POST /user/outfits 的请求体。
 * 注意两处「读写不对称」：
 *  - 发的是 garment_ids（一串 id），读回来的 Outfit 里是 garments（一串对象）
 *  - 发的是 tip（单数字符串），读回来的 Outfit 里是 tips（复数数组）
 */
export interface SaveOutfitRequest {
  name: string; // 必填
  occasion_en: string; // 必填
  garment_ids: string[]; // 必填，至少 1 个
  source_en?: string; // tag5_result / tag7_workshop
  feel_en?: string;
  tags_en?: string[];
  tip?: string; // 单数
  reason?: string;
}

/** GET /user/outfits 的 data —— 注意这个接口没有 pagination，只有 items */
export interface SavedOutfitList {
  items: Outfit[];
}

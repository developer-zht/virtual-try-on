/** 穿搭状态（文档 §11：用 status 取代旧的 is_saved 字段） */
export type OutfitStatus = 'generated' | 'saved';

/**
 * Outfit 里嵌的衣物是「精简版」——只有展示要用的几个字段，
 * 不是完整的 Garment（没有 material/confidence/processing_status 等）。
 * 所以单独建类型，别复用 wardrobe 的 Garment。
 */
export interface OutfitGarment {
  id: string;
  category: string;
  category_en: string;
  primary_color: string | null;
  primary_color_en: string | null;
  image_url: string;
  display_image_url: string;
}

/** Outfit 附带的简版天气，比 /weather 的 Weather 少得多，别混用 */
export interface OutfitWeather {
  temp: number;
  condition: string;
  humidity: number;
}

/** 一套穿搭 */
export interface Outfit {
  id: string;
  status: OutfitStatus;
  name?: string; // 有些场景（如 generated）可能没有
  source_en?: string;
  tags_en: string[];
  occasion: string;
  occasion_en: string;
  garments: OutfitGarment[];
  reason?: string;
  feel_en?: string;
  tips: string[];
  created_at: string;
  weather?: OutfitWeather;
}

/** POST /outfits/recommend 的请求体 */
export interface RecommendRequest {
  occasion: string; // 必填：commute / casual / date ...
  weather_feel?: 'cool' | 'comfortable' | 'warm';
  strategy?: string;
  visual_style?: string;
  filters?: {
    // 整个 filters 可选，里面每个也都可选
    color_tone?: string;
    priority?: string;
  };
  max_outfits?: number; // 默认 1，最大 5
}

/** POST /outfits/recommend 的 data */
export interface RecommendResult {
  outfits: Outfit[];
  weather: OutfitWeather;
}

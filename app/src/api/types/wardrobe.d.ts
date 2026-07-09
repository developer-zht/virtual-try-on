import type { Pagination } from './pagination';

/** 衣物品类枚举：衣柜筛选、统计都用这一套英文值 */
export type CategoryEn = 'TOPS' | 'BOTTOMS' | 'SHOES' | 'OUTERWEAR' | 'ACCESSORIES' | 'BAGS';

/** AI 处理状态 */
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** 一件衣物 */
export interface Garment {
  id: string;
  image_url: string;
  cutout_url: string | null; // 抠图可能还没生成
  display_image_url: string;
  category: string; // 中文，如 "上衣"
  category_en: CategoryEn; // 英文枚举
  primary_color: string | null;
  primary_color_en: string | null;
  material: string | null;
  style_tags: string[];
  confidence: number | null;
  reason: string | null;
  needs_confirmation: boolean;
  processing_status: ProcessingStatus;
  is_manually_edited: boolean;
  created_at: string;
}

/** GET /wardrobe 的 data */
export interface WardrobeList {
  items: Garment[];
  pagination: Pagination;
}

/** GET /wardrobe/stats 的 data */
export interface CategoryCount {
  category: string;
  category_en: CategoryEn;
  count: number;
}
export interface WardrobeStats {
  total: number;
  by_category: CategoryCount[];
}

/** 衣柜列表筛选参数（都可选） */
export interface WardrobeQuery {
  category_en?: CategoryEn;
  page?: number;
  limit?: number;
}

/** PUT /wardrobe/:id 的请求体：手动修正识别结果，字段都可选 */
export interface GarmentPatch {
  category_en?: CategoryEn;
  primary_color_en?: string;
  material?: string;
}

/** POST /wardrobe/upload 的响应 data（202） */
export interface UploadConfirmResult {
  task_id: string;
  status: string; // "pending"
  stage: string; // "segmenting"
  poll_after_ms: number;
}

/** 异步任务状态 */
export type TaskStatus = 'pending' | 'processing' | 'done' | 'failed';

/** GET /tasks/:id 的响应 data */
export interface Task {
  id: string;
  status: TaskStatus;
  stage: string;
  progress: number;
  poll_after_ms: number;
  garments?: Garment[]; // done 且是衣橱导入时才有
  error_code?: string; // failed 时
  error_message?: string; // failed 时
  created_at: string;
  completed_at?: string;
}

/** POST /wardrobe/upload-url 的请求体 */
export interface UploadUrlRequest {
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  file_size: number; // 字节，最大 10MB
}

/** POST /wardrobe/upload-url 的响应 data */
export interface UploadUrlResult {
  upload_id: string;
  object_key: string;
  upload_url: string; // 直传 OSS 的预签名地址
  public_url: string;
  expires_in: number; // 秒（900 = 15分钟）
  headers: Record<string, string>; // 直传时必须原样带上的头（含 Content-Type）
}

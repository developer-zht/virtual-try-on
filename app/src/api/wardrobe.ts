import { TaskFailedError, ValidationError } from '@/errors';
import { API } from './_configs/url';
import { request } from './request';
import { pollTask } from './tasks';
import type {
  Garment,
  GarmentPatch,
  UploadConfirmResult,
  UploadUrlRequest,
  UploadUrlResult,
  WardrobeList,
  WardrobeQuery,
  WardrobeStats,
} from './types/wardrobe';
import axios from 'axios';

/** 衣柜列表（可按品类 / 分页筛选） */
export function listWardrobe(query: WardrobeQuery = {}): Promise<WardrobeList> {
  return request<WardrobeList>({ url: API.wardrobe.list, method: 'GET', params: query });
}

/** 衣柜分类统计 */
export function getWardrobeStats(): Promise<WardrobeStats> {
  return request<WardrobeStats>({ url: API.wardrobe.stats, method: 'GET' });
}

/** 单件衣物详情 */
export function getGarment(id: string): Promise<Garment> {
  return request<Garment>({ url: API.wardrobe.byId(id), method: 'GET' });
}

/** 手动修正衣物：返回更新后的 Garment */
export function updateGarment(id: string, patch: GarmentPatch): Promise<Garment> {
  return request<Garment>({ url: API.wardrobe.byId(id), method: 'PUT', data: patch });
}

/** 删除衣物。成功响应没有 data */
export function deleteGarment(id: string): Promise<void> {
  return request<void>({ url: API.wardrobe.byId(id), method: 'DELETE' });
}

/** 确认上传完成、启动 AI 导入（需 JWT） */
export function confirmUpload(uploadId: string): Promise<UploadConfirmResult> {
  return request<UploadConfirmResult>({
    url: API.wardrobe.upload,
    method: 'POST',
    data: { upload_id: uploadId },
  });
}

/** 第 1 步：申请预签名直传地址（需 JWT） */
export function requestUploadUrl(body: UploadUrlRequest) {
  return request<UploadUrlResult>({ url: API.wardrobe.uploadUrl, method: 'POST', data: body });
}

/** 第 2 步：裸 axios 把字节 PUT 给 OSS（不带 JWT、不解包信封） */
export async function uploadToOss(result: UploadUrlResult, file: Blob): Promise<void> {
  await axios.put(result.upload_url, file, {
    headers: { 'Content-Type': result.headers['Content-Type'] ?? 'application/octet-stream' },
  });
}

/** 端到端编排：File → 直传 → 确认 → 轮询 → 拿到导入的衣物 */
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED)[number];
function isAllowedMime(t: string): t is AllowedMime {
  return (ALLOWED as readonly string[]).includes(t);
}
async function normalizeImageFile(file: File, maxEdge = 2048): Promise<File> {
  if (isAllowedMime(file.type)) return file; // 已是 jpeg/png/webp 直接用
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new ValidationError('无法读取该图片，请换一张'));
      el.src = url;
    });
    let w = img.naturalWidth,
      h = img.naturalHeight;
    if (Math.max(w, h) > maxEdge) {
      const s = maxEdge / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ValidationError('图片转码失败，请换一张');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) throw new ValidationError('图片转码失败，请换一张');
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, {
      type: 'image/jpeg',
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function importGarment(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Garment[]> {
  const normalized = await normalizeImageFile(file); // HEIC/空 → JPEG
  if (!isAllowedMime(normalized.type))
    throw new ValidationError(`不支持的图片格式：${normalized.type || '未知'}`);
  const uploaded = await requestUploadUrl({
    content_type: normalized.type,
    file_size: normalized.size,
  });
  console.log(uploaded);
  await uploadToOss(uploaded, normalized);
  const uploadConfirmResult = await confirmUpload(uploaded.upload_id);
  console.log(uploadConfirmResult);
  const task = await pollTask(uploadConfirmResult.task_id, 600_000, onProgress);
  console.log(task);
  if (task.status === 'failed')
    throw new TaskFailedError(
      uploadConfirmResult.task_id,
      task.error_message ?? '衣物导入失败',
      task.error_code,
    );
  return task.garments ?? [];
}

/** 单独触发抠图（后端目前 501） */
export function removeBackground(id: string): Promise<void> {
  return request<void>({ url: API.wardrobe.removeBackground(id), method: 'POST' });
}

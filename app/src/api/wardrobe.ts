import { TaskTimeoutError } from '@/errors';
import { API } from './_configs/url';
import { request } from './request';
import type {
  Garment,
  GarmentPatch,
  Task,
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
  return request<WardrobeList>({
    url: API.wardrobe.list,
    method: 'GET',
    params: query,
  });
}

/** 衣柜分类统计 */
export function getWardrobeStats(): Promise<WardrobeStats> {
  return request<WardrobeStats>({ url: API.wardrobe.stats, method: 'GET' });
}

/** 单件衣物详情 */
export function getGarment(id: string): Promise<Garment> {
  return request<Garment>({ url: API.wardrobe.byId(id), method: 'GET' });
}

/** 手动修正衣物：返回更新后的 Garment（is_manually_edited 会被服务端置为 true） */
export function updateGarment(id: string, patch: GarmentPatch): Promise<Garment> {
  return request<Garment>({ url: API.wardrobe.byId(id), method: 'PUT', data: patch });
}

/** 删除衣物。成功响应没有 data，所以返回 Promise<void> */
export function deleteGarment(id: string): Promise<void> {
  return request<void>({ url: API.wardrobe.byId(id), method: 'DELETE' });
}

/** 确认上传完成、启动 AI 导入（走 instance，需 JWT） */
export function confirmUpload(uploadId: string): Promise<UploadConfirmResult> {
  return request<UploadConfirmResult>({
    url: API.wardrobe.upload,
    method: 'POST',
    data: { upload_id: uploadId },
  });
}

/** 查一次任务进度 */
export function getTask(id: string): Promise<Task> {
  return request<Task>({ url: API.tasks.byId(id), method: 'GET' });
}

/** 轮询任务直到 done/failed；超过 maxWaitMs 抛超时 */
export async function pollTask(id: string, maxWaitMs = 60_000) {
  const deadline = Date.now() + maxWaitMs;

  for (;;) {
    const task = await getTask(id);
    if (task.status === 'done' || task.status === 'failed') return task;
    if (Date.now() > deadline) throw new TaskTimeoutError(id, maxWaitMs);
    const wait = task.poll_after_ms || 2000;
    await new Promise((resolve) => setTimeout(() => resolve, wait));
  }
}

/**
 * 图片上传 OSS
 *
 * 第 1 步：申请预签名直传地址（走 instance，需 JWT）
 *
 * 第 2 步：把图片二进制直传 OSS。
 * 关键：用「裸 axios」而不是我们的 request/instance——
 *  - 不能带 JWT（会破坏 OSS 签名）
 *  - 返回的不是 {code,message,data} 信封，别用 request 解包
 *  - data 是 Blob/File（原始字节），Content-Type 手动指定（就是第 1 步给的那个）
 */
export function requestUploadUrl(body: UploadUrlRequest) {
  return request<UploadUrlResult>({
    url: API.wardrobe.uploadUrl,
    method: 'POST',
    data: body,
  });
}
// uploadToOss 只是要把字节 PUT 出去，它根本不关心文件名
// 所以用更宽的 Blob——这样不光能收 File，还能收别的 Blob（比如你把图裁剪后 canvas 生成的 Blob、没有文件名），更通用
export async function uploadToOss(result: UploadUrlResult, file: Blob): Promise<void> {
  await axios.put(result.upload_url, file, {
    headers: { 'Content-Type': result.headers['Content-Type'] ?? 'application/octet-stream' },
  });
}

/** 端到端编排：选好的图片 File → 直传 → 确认 → 轮询 → 拿到导入的衣物 */
// importGarment 是"从用户选的图片开始"的入口，语义上进来的就是一个 File，用 File 是在类型上写明意图，而因为 File is-a Blob，把它传给要 Blob 的 uploadToOss 天经地义（里氏替换）
export async function importGarment(file: File): Promise<Garment[]> {
  const uploaded = await requestUploadUrl({
    content_type: file.type as UploadUrlRequest['content_type'],
    file_size: file.size,
  });
  await uploadToOss(uploaded, file);
  const { task_id } = await confirmUpload(uploaded.upload_id);
  const task = await pollTask(task_id);
  if (task.status === 'failed') throw new Error(task.error_message ?? '衣物导入失败');
  return task.garments ?? [];
}

/**
 * 单独触发抠图
 *
 * 后端目前未实现，固定返回 501
 * @example
 * try {
 *   await removeBackground(id);
 * } catch (e) {
 *   if (e instanceof HttpError && e.status === 501) notify('该功能暂未开放');
 * }
 */
export function removeBackground(id: string): Promise<void> {
  return request<void>({ url: API.wardrobe.removeBackground(id), method: 'POST' });
}

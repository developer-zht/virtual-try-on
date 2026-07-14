import type { Garment } from './wardrobe';

export type TaskType = 'garment_import' | 'full_tryon' | 'user_model';
export type TaskStatus = 'pending' | 'processing' | 'done' | 'failed';

/** 202：异步任务创建响应 */
export interface TaskCreated {
  task_id: string;
  task_type: TaskType;
  status: TaskStatus;
  stage: string;
  poll_after_ms: number;
}
export interface TryonTaskResult {
  id: string;
  image_url: string;
  mode: 'composited' | 'text_only';
  garment_count: number;
}
export interface UserModelTaskResult {
  model_image_url: string;
  generation_mode: 'virtual' | 'avatar';
}

/** GET /tasks/:id：三种 task_type 共用，结果块按类型可选 */
export interface Task {
  id: string;
  task_type?: TaskType;
  status: TaskStatus;
  stage: string;
  progress: number;
  poll_after_ms: number;
  garments?: Garment[]; // garment_import
  tryon_result?: TryonTaskResult; // full_tryon
  user_model_result?: UserModelTaskResult; // user_model
  error_code?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

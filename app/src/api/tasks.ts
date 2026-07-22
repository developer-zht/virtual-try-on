import { API } from './_configs/url';
import { request } from './request';
import { TaskTimeoutError } from '@/errors';
import type { Task } from './types/tasks';

export function getTask(id: string): Promise<Task> {
  return request<Task>({ url: API.tasks.byId(id), method: 'GET' });
}

export async function pollTask(
  id: string,
  maxWaitMs = 60_000,
  onProgress?: (p: number) => void,
): Promise<Task> {
  const deadline = Date.now() + maxWaitMs;

  for (;;) {
    const task = await getTask(id);
    onProgress?.(task.progress);
    if (task.status === 'done' || task.status === 'failed') return task;
    if (Date.now() > deadline) throw new TaskTimeoutError(id, maxWaitMs);
    const wait = task.poll_after_ms || 2000;
    await new Promise<void>((resolve) => setTimeout(() => resolve(), wait));
  }
}

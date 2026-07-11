import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import type { Ref } from 'vue';

/**
 * 统一包裹一次异步调用：自动开关 loading、写 error。
 * - 已知错误(AppError 子类) → 写进 error、返回 null（吞掉）
 * - 未知错误 → 继续抛（让 Sentry 抓真 bug）
 */
export async function _runAsync<T>(
  fn: () => Promise<T>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
): Promise<T | null> {
  loading.value = true;
  error.value = null;

  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) {
      error.value = messageFromError(e);
      return null;
    }
    throw e;
  } finally {
    loading.value = false;
  }
}

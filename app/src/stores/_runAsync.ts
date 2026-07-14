import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import type { Ref } from 'vue';
import { useNotifyStore } from './notify';

export async function _runAsync<T>(
  fn: () => Promise<T>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  opts?: { toast?: boolean },
): Promise<T | null> {
  loading.value = true;
  error.value = null;

  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) {
      const msg = messageFromError(e);
      error.value = msg;
      if (opts?.toast !== false) useNotifyStore().error(msg); // 默认自动弹错误 toast
      return null;
    }
    throw e;
  } finally {
    loading.value = false;
  }
}

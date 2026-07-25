import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { UserModelRequest } from '@/api/types/userModel';
import { createUserModel } from '@/api/userModel';
import { pollTask } from '@/api/tasks';
import { useAuthStore } from './auth';

export type ProfileModelStatus = 'idle' | 'submitting' | 'polling' | 'failed';

export const useProfileModelStore = defineStore('profile-model', () => {
  const status = ref<ProfileModelStatus>('idle');
  const taskId = ref<string | null>(null);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);
  const generating = computed(() => status.value === 'submitting' || status.value === 'polling');

  function failureMessage(errorValue: unknown): string {
    return errorValue instanceof Error && errorValue.message
      ? errorValue.message
      : '专属模特生成失败，请稍后重试';
  }

  function fail(message: string): false {
    status.value = 'failed';
    taskId.value = null;
    progress.value = 0;
    error.value = message;
    return false;
  }

  async function generate(request: UserModelRequest = {}): Promise<boolean> {
    if (generating.value) return false;

    status.value = 'submitting';
    progress.value = 0;
    error.value = null;

    try {
      const created = await createUserModel(request);
      taskId.value = created.task_id;
      status.value = 'polling';

      const task = await pollTask(created.task_id, 600_000, (nextProgress) => {
        progress.value = nextProgress;
      });
      if (task.status === 'failed') {
        return fail(task.error_message || '专属模特生成失败，请稍后重试');
      }
      const resultUrl = task.user_model_result?.model_image_url;
      if (!resultUrl) return fail('模型任务已完成，但没有返回图片');
      if (task.status !== 'done' || !resultUrl) return false;

      useAuthStore().acceptAvatarUrl(resultUrl);
      status.value = 'idle';
      taskId.value = null;
      progress.value = 100;
      return true;
    } catch (caught) {
      return fail(failureMessage(caught));
    }
  }

  return { status, taskId, progress, error, generating, generate };
});

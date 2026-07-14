import { ref } from 'vue';
import type { Garment } from '@/api/types/wardrobe';
import type { UserModelRequest } from '@/api/types/userModel';
import { createUserModel } from '@/api/userModel';
import { createTryOnFull, createTryOnForOutfit } from '@/api/tryon';
import { pollTask } from '@/api/tasks';
import { useAuthStore } from '@/stores/auth';
import { AppError, TaskFailedError, ValidationError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';

export function useTryOn() {
  const auth = useAuthStore();
  const trying = ref(false);
  const progress = ref(0);
  const stage = ref<'model' | 'tryon' | ''>('');
  const image = ref<string | null>(null);
  const error = ref<string | null>(null);
  function reset() {
    image.value = null;
    error.value = null;
  }

  async function ensureModel(model?: UserModelRequest): Promise<string> {
    const existing = auth.user?.avatar_url;
    if (existing) return existing;
    if (!model) throw new ValidationError('请先设置模特参数');
    stage.value = 'model';
    progress.value = 0;
    const created = await createUserModel(model);
    const done = await pollTask(created.task_id, 300_000, (p) => (progress.value = p));
    if (done.status === 'failed')
      throw new TaskFailedError(
        created.task_id,
        done.error_message ?? '模特生成失败',
        done.error_code,
      );
    const url = done.user_model_result?.model_image_url;
    if (!url) throw new ValidationError('模特生成没有返回结果图');
    void auth.restore();
    return url;
  }

  async function runTask(taskId: string): Promise<void> {
    stage.value = 'tryon';
    progress.value = 0;
    const done = await pollTask(taskId, 300_000, (p) => (progress.value = p));
    if (done.status === 'failed')
      throw new TaskFailedError(taskId, done.error_message ?? '试穿失败', done.error_code);
    image.value = done.tryon_result?.image_url ?? null;
  }

  async function guarded(fn: () => Promise<void>): Promise<boolean> {
    trying.value = true;
    error.value = null;
    image.value = null;
    try {
      await fn();
      return !!image.value;
    } catch (e) {
      if (e instanceof AppError) error.value = messageFromError(e);
      else throw e;
      return false;
    } finally {
      trying.value = false;
      stage.value = '';
    }
  }

  function tryOutfit(outfitId: string, model?: UserModelRequest): Promise<boolean> {
    return guarded(async () => {
      await ensureModel(model);
      const c = await createTryOnForOutfit(outfitId);
      await runTask(c.task_id);
    });
  }

  function tryGarments(garments: Garment[], model?: UserModelRequest): Promise<boolean> {
    return guarded(async () => {
      const person = await ensureModel(model);
      const c = await createTryOnFull({
        person_image_url: person,
        garment_image_urls: garments.map((g) => g.display_image_url),
        outfit_items: garments.map((g) => ({
          category: g.category_en,
          name: g.category,
          primary_color: g.primary_color_en ?? '',
        })),
        preserve_face: true,
      });
      await runTask(c.task_id);
    });
  }

  return { trying, progress, stage, image, error, reset, tryOutfit, tryGarments };
}

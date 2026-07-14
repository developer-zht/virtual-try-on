import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Garment } from '@/api/types/wardrobe';
import { saveOutfit } from '@/api/userOutfits';
import { _runAsync } from './_runAsync';
import { AppError, TaskFailedError, ValidationError } from '@/errors';
import type { UserModelRequest } from '@/api/types/userModel';
import { useAuthStore } from './auth';
import { createUserModel } from '@/api/userModel';
import { pollTask } from '@/api/tasks';
import { createTryOnFull } from '@/api/tryon';
import { messageFromError } from '@/utils/errorMessage';

export const useWorkshopStore = defineStore('workshop', () => {
  const auth = useAuthStore();

  // ── state ──
  const items = ref<Garment[]>([]); // 已「上身」的单品（直接用 wardrobe 的 Garment）
  const saving = ref(false);
  const error = ref<string | null>(null);

  // ── 试穿 ──
  const trying = ref(false);
  const tryProgress = ref(0);
  const tryStage = ref<'model' | 'tryon' | ''>('');
  const tryImage = ref<string | null>(null);

  // ── getters ──
  const count = computed(() => items.value.length);
  const isEmpty = computed(() => items.value.length === 0);
  const garmentIds = computed(() => items.value.map((g) => g.id));

  // ── actions：compose（纯本地同步）──
  function add(g: Garment) {
    if (!items.value.some((x) => x.id === g.id)) items.value.push(g); // 去重
  }
  function remove(id: string) {
    const i = items.value.findIndex((g) => g.id === id);
    if (i !== -1) items.value.splice(i, 1);
  }
  function clear() {
    // items.value = [];
    items.value = [];
    error.value = null;
    trying.value = false;
    tryProgress.value = 0;
    tryStage.value = '';
    tryImage.value = null;
  }

  // ── action：保存为收藏穿搭（source=tag7_workshop）──
  async function save(payload: {
    name: string;
    occasion_en: string;
    tags_en?: string[];
  }): Promise<boolean> {
    if (isEmpty.value) {
      error.value = '请先选几件单品上身';
      return false;
    }
    if (!payload.name.trim()) {
      error.value = '给这套穿搭起个名字';
      return false;
    }
    const outfit = await _runAsync(
      () =>
        saveOutfit({
          name: payload.name.trim(),
          occasion_en: payload.occasion_en,
          garment_ids: garmentIds.value,
          source_en: 'tag7_workshop',
          ...(payload.tags_en && {
            tags_en: payload.tags_en,
          }),
        }),
      saving,
      error,
    );
    return !!outfit; // 成功 → true（偏好页会 fetch 到这条）
  }

  // 确保有模特图：有 avatar 用；没有用 model 参数生成
  async function ensureAvatar(model?: UserModelRequest): Promise<string> {
    const existing = auth.user?.avatar_url;
    if (existing) return existing;
    if (!model) throw new ValidationError('请先设置模特参数');
    tryStage.value = 'model';
    tryProgress.value = 0;
    const created = await createUserModel(model);
    const task = await pollTask(created.task_id, 600_000, (p) => (tryProgress.value = p));
    if (task.status === 'failed')
      throw new TaskFailedError(
        created.task_id,
        task.error_message ?? '模特生成失败',
        task.error_code,
      );
    const url = task.user_model_result?.model_image_url;
    if (!url) throw new ValidationError('模特生成没有返回结果图');
    void auth.restore(); // best-effort 刷新 auth.user
    return url;
  }

  // 试穿：确保模特 → /tryon/full → 轮询 → 结果图
  async function tryOn(model?: UserModelRequest): Promise<boolean> {
    if (isEmpty.value) {
      error.value = '先选几件单品上身';
      return false;
    }
    trying.value = true;
    error.value = null;
    tryImage.value = null;
    try {
      const person = await ensureAvatar(model);
      tryStage.value = 'tryon';
      tryProgress.value = 0;
      const created = await createTryOnFull({
        person_image_url: person,
        garment_image_urls: items.value.map((g) => g.display_image_url),
        outfit_items: items.value.map((g) => ({
          category: g.category_en,
          name: g.category,
          primary_color: g.primary_color_en ?? '',
        })),
        preserve_face: true,
      });
      const task = await pollTask(created.task_id, 600_000, (p) => (tryProgress.value = p));
      if (task.status === 'failed')
        throw new TaskFailedError(
          created.task_id,
          task.error_message ?? '试穿失败',
          task.error_code,
        );
      tryImage.value = task.tryon_result?.image_url ?? null;
      return !!tryImage.value;
    } catch (e) {
      if (e instanceof AppError) error.value = messageFromError(e);
      else throw e;
      return false;
    } finally {
      trying.value = false;
      tryStage.value = '';
    }
  }

  return {
    items,
    saving,
    error,
    trying,
    tryProgress,
    tryStage,
    tryImage,
    count,
    isEmpty,
    garmentIds,
    add,
    remove,
    clear,
    save,
    tryOn,
  };
});

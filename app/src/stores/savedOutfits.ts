import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { computed, ref } from 'vue';
import type { Outfit } from '@/api/types/outfits';
import { _runAsync } from './_runAsync';
import { deleteSavedOutfit, listSavedOutfits } from '@/api/userOutfits';
import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import { useNotifyStore } from './notify';

export const useSavedOutfitsStore = defineStore('savedOutfits', () => {
  const auth = useAuthStore(); // 跨 store 读登录态（像 home.canGenerate）

  // ── state ──
  const items = ref<Outfit[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // ── getters（全从 items 自洽派生）──
  const isEmpty = computed(() => items.value.length === 0);
  const savedCount = computed(() => items.value.length);
  const occasionCount = computed(() => new Set(items.value.map((o) => o.occasion_en)).size);
  const tagCount = computed(() => new Set(items.value.flatMap((o) => o.tags_en)).size);

  // ── actions ──
  // 未登录 → 不发请求、清空（isEmpty 为真 → UI 显空态 + 引导登录）
  async function fetchSaved(): Promise<void> {
    if (!auth.loggedIn) {
      items.value = [];
      return;
    }

    const res = await _runAsync(() => listSavedOutfits(), loading, error);
    console.log(res);
    if (res) items.value = res.items;
  }

  // 删除：乐观移除 + 失败回滚（复用 wardrobe 范式）
  async function removeSaved(id: string): Promise<boolean> {
    const index = items.value.findIndex((o) => o.id === id);
    if (index === -1) {
      // 幂等 no-op
      if (import.meta.env.DEV)
        console.debug('[savedOutfits] removeSaved: id 不在列表（已删除?）', id);
      return false;
    }
    const backup = items.value[index]!; // 先乐观移除
    items.value.splice(index, 1);
    try {
      await deleteSavedOutfit(id);
      return true;
    } catch (e) {
      items.value.splice(index, 0, backup); // 回滚
      if (e instanceof AppError) {
        const msg = messageFromError(e);
        error.value = msg;
        useNotifyStore().error(msg);
        return false;
      } else throw e; // 未知错误重抛 Sentry
    }
  }

  return {
    items,
    loading,
    error,
    isEmpty,
    savedCount,
    tagCount,
    occasionCount,
    fetchSaved,
    removeSaved,
  };
});

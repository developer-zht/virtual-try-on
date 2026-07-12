import type { Garment, WardrobeList } from '@/api/types/wardrobe';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { _runAsync } from './_runAsync';
import { listWardrobe } from '@/api/wardrobe';
import { importGarment, deleteGarment } from '@/api/wardrobe';
import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';

export type WardrobeItem = Garment; // 契约叫 WardrobeItem，API 真实类型是 Garment → 别名对齐

export const useWardrobeStore = defineStore('wardrobe', () => {
  // ── state ──
  const items = ref<WardrobeItem[]>([]);
  const loading = ref(false); // 补充：_runAsync 要用；UI 骨架屏可用
  const error = ref<string | null>(null); // 补充：错误文案

  const importing = ref(false); // 上传导入：几秒级，要和列表 loading 分开
  const importProgress = ref(0);

  // ── getters ──
  const hasClothes = computed(() => items.value.length > 0);
  const isEmpty = computed(() => !hasClothes.value);

  // ── actions ──
  async function getClothes(): Promise<void> {
    const res: WardrobeList | null = await _runAsync(() => listWardrobe(), loading, error);

    if (res) items.value = res.items; // 成功才写；出错时 res=null，error 已填好
  }

  function addCloth(item: WardrobeItem) {
    items.value.unshift(item); // 同步 action：本地加一件，放最前
  }

  // 上传：选图 → API 层编排(直传OSS→确认→轮询) → 拿到 Garment[] → add 进列表
  async function importFromFile(file: File) {
    const garments = await _runAsync(
      () => importGarment(file, (p) => (importProgress.value = p)),
      importing,
      error,
    );
    if (garments) garments.forEach(addCloth); // 复用 addCloth()
  }

  // 删除：乐观移除 + 失败回滚
  async function removeCloth(id: string) {
    const idx = items.value.findIndex((g) => g.id === id);
    if (idx === -1) {
      if (import.meta.env.DEV) console.debug('[wardrobe] removeCloth: id 不在列表（已删除?）', id);
      return;
    }
    const backup = items.value[idx]!;
    items.value.splice(idx, 1);
    try {
      await deleteGarment(id);
    } catch (e) {
      items.value.splice(idx, 0, backup); // 回滚
      if (e instanceof AppError) error.value = messageFromError(e);
      else throw e;
    }
  }

  return {
    items,
    loading,
    error,
    importing,
    importProgress,
    hasClothes,
    isEmpty,
    getClothes,
    addCloth,
    importFromFile,
    removeCloth,
  };
});

import { ref } from 'vue';
import type { EnumItem } from '@/api/types/metadata';
import { getEnums } from '@/api/metadata';

// 模块级 → 所有 useEnums() 共享同一份缓存（类单例）；对比 useWeather 每次新 state
const types = ref<Record<string, EnumItem[]>>({});
const loaded = ref(false);
let inflight: Promise<void> | null = null;

export function useEnums() {
  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return;
    inflight ??= getEnums() // 并发去重：同时调也只发一次
      .then((all) => {
        types.value = all.types;
        loaded.value = true;
      })
      .catch((e) => {
        if (import.meta.env.DEV) console.warn('[enums] 加载失败：', e);
      })
      .finally(() => {
        inflight = null;
      });
    await inflight;
  }

  const get = (type: string): EnumItem[] => types.value[type] ?? [];

  const label = (type: string, value: string | null): string =>
    value ? (get(type).find((o) => o.value === value)?.label_zh ?? value) : '';

  return { types, loaded, ensureLoaded, get, label };
}

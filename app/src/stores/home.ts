import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from './auth';
import { useWardrobeStore } from './wardrobe';
import type { Outfit } from '@/api/types/outfits';
import { recommendOutfits } from '@/api/outfits';
import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';

export const useHomeStore = defineStore('home', () => {
  const generating = ref(false);
  const genProg = ref(0); // 生成进度
  const outfitReady = ref(false);
  const outfits = ref<Outfit[]>([]); // ← 真结果放这，供 UI 渲染
  const error = ref<string | null>(null);

  const auth = useAuthStore();
  const wardrobe = useWardrobeStore();

  const canGenerate = computed(() => auth.loggedIn && wardrobe.hasClothes); // 跨 store 派生

  async function generate(): Promise<void> {
    if (generating.value || !canGenerate.value) return;

    genProg.value = 0;
    generating.value = true;

    // recommend 没有真实进度可轮询 → 纯 UX 假进度：先爬到 90，等真结果回来再跳 100
    const timer = setInterval(() => {
      genProg.value = Math.min(genProg.value + 10, 90);
    }, 200);

    try {
      const result = await recommendOutfits({
        occasion: 'commute', // ⚠️ 待后端确认真正必填字段，别照抄
        max_outfits: 3,
      });
      outfits.value = result.outfits;
      genProg.value = 100;
      outfitReady.value = true;
    } catch (e) {
      // 想按类型给不同文案，就在这 instanceof 分流（你的错误体系正好用上）
      if (e instanceof AppError) {
        error.value = messageFromError(e);
      }
      throw e;
    } finally {
      clearInterval(timer); // 无论成败都清掉定时器 + 复位 generating
      generating.value = false;
    }
  }

  return { outfitReady, generating, genProg, canGenerate, generate };
});

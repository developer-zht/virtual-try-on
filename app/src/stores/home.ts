import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from './auth';
import { useWardrobeStore } from './wardrobe';
import type { Outfit, OutfitWeather, RecommendRequest } from '@/api/types/outfits';
import { recommendOutfits } from '@/api/outfits';
import { AppError, HttpError, TaskFailedError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import { runFakeProgress } from '@/utils/progressController';
import { getTodayOutfit, setTodayOutfit } from '@/api/userOutfits';
import { useNotifyStore } from './notify';
import { pollTask } from '@/api/tasks';
import { createTryOnForOutfit } from '@/api/tryon';

export const useHomeStore = defineStore('home', () => {
  const generating = ref(false);
  const genProg = ref(0); // 生成进度
  const outfitReady = ref(false);
  const outfits = ref<Outfit[]>([]); // 真结果放这，供 UI 渲染
  const weather = ref<OutfitWeather | null>(null);
  const error = ref<string | null>(null);
  const occasion = ref('commute');

  const auth = useAuthStore();
  const wardrobe = useWardrobeStore();

  const canGenerate = computed(() => auth.loggedIn && wardrobe.hasClothes); // 跨 store 派生

  const tryOnImages = ref<Record<string, string>>({});
  const tryOnProgress = ref<Record<string, number>>({});
  const tryOnLoading = ref<Record<string, boolean>>({});
  const tryOnErrors = ref<Record<string, string | null>>({});

  const inflightTryOns = new Map<string, Promise<string | null>>();

  async function ensureOutfitTryOnImage(outfitId: string): Promise<string | null> {
    if (!auth.user?.avatar_url) return null;

    const cached = tryOnImages.value[outfitId];
    if (cached) return cached;

    const inflight = inflightTryOns.get(outfitId);
    if (inflight) return inflight;

    const promise = (async () => {
      tryOnLoading.value[outfitId] = true;
      tryOnProgress.value[outfitId] = 0;
      tryOnErrors.value[outfitId] = null;

      const created = await createTryOnForOutfit(outfitId);
      const task = await pollTask(created.task_id, 300_000, (p) => {
        tryOnProgress.value[outfitId] = p;
      });

      if (task.status === 'failed') {
        throw new TaskFailedError(
          created.task_id,
          task.error_message ?? '试穿失败',
          task.error_code,
        );
      }

      const imageUrl = task.tryon_result?.image_url ?? null;
      if (imageUrl) tryOnImages.value[outfitId] = imageUrl;
      return imageUrl;
    })()
      .catch((e) => {
        tryOnErrors.value[outfitId] = e instanceof AppError ? messageFromError(e) : '试穿失败';
        return null;
      })
      .finally(() => {
        tryOnLoading.value[outfitId] = false;
        inflightTryOns.delete(outfitId);
      });

    inflightTryOns.set(outfitId, promise);
    return promise;
  }

  function setOccasion(next: string) {
    occasion.value = next;
  }

  async function generate(payload: Partial<RecommendRequest> = {}): Promise<void> {
    if (generating.value || !canGenerate.value) {
      if (import.meta.env.DEV)
        console.debug('[home] generate 早退：', {
          generating: generating.value,
          loggedIn: auth.loggedIn,
          hasClothes: wardrobe.hasClothes,
        });
      return;
    }

    genProg.value = 0;
    generating.value = true;

    // recommend 没有真实进度可轮询 → 纯 UX 假进度：先爬到 90，等真结果回来再跳 100
    const fakeProgress = runFakeProgress(genProg);

    try {
      const result = await recommendOutfits({
        occasion: payload.occasion ?? occasion.value, // ⚠️ 待后端确认真正必填字段，别照抄
        max_outfits: 3,
      });
      console.log('generate', result.outfits);
      outfits.value = result.outfits;
      weather.value = result.weather;
      console.log(result.outfits);
      genProg.value = 100;
      outfitReady.value = true;
      useNotifyStore().success('今日穿搭已生成'); // 成功分支末尾（不是页面里——放 store 里所有调用方都受益）
    } catch (e) {
      // 想按类型给不同文案，就在这 instanceof 分流（你的错误体系正好用上）
      if (e instanceof AppError) {
        const msg = messageFromError(e);
        error.value = msg;
        useNotifyStore().error(msg);
      }
      throw e;
    } finally {
      fakeProgress.stop(); // 无论成败都清掉定时器 + 复位 generating
      generating.value = false;
    }
  }

  // —— 读：刷新时复活今日穿搭 ——
  async function loadTodayOutfits(): Promise<void> {
    if (!auth.loggedIn) return; // 需 JWT，未登录不发
    try {
      const outfit = await getTodayOutfit(); // GET /user/today-outfit → Outfit
      outfits.value = [outfit];
      weather.value = outfit.weather ?? null;
      outfitReady.value = true; // ← 复活今日穿搭态
      console.log(outfit);
    } catch (e) {
      // 没设过今日穿搭 → 后端 404 / 40401，是正常（保持 Welcome），不是接口坏了。
      // 开发期打一条 debug 讲清楚，日后（或别人）看见 404 不用翻文档、不用怀疑接口。
      if (import.meta.env.DEV) {
        const notSet = e instanceof HttpError && (e.status === 404 || e.code === 40401);
        console.debug(
          notSet
            ? '[home] loadToday(path: /today-outfit)：今日穿搭未设置（404，正常，显示 Welcome）'
            : '[home] loadToday(path: /today-outfit) 失败（非 404，需关注）：',
          e,
        );
      }
    }
  }

  // —— 写：把一套落库为「今日」（best-effort，失败不打断展示）——
  async function persistToday(id?: string): Promise<void> {
    if (!id) return;
    try {
      await setTodayOutfit(id); // 要求 status=generated；recommend 出的正好是 ✓
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[home] setTodayOutfit 失败：', e);
    }
  }

  return {
    outfitReady,
    generating,
    genProg,
    error,
    outfits,
    weather,
    canGenerate,
    tryOnImages,
    tryOnProgress,
    tryOnLoading,
    tryOnErrors,
    setOccasion,
    generate,
    loadTodayOutfits,
    persistToday,
    ensureOutfitTryOnImage,
  };
});

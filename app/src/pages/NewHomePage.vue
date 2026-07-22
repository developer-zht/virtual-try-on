<template>
  <div class="home" :class="{ 'home--hero-fullscreen': isHeroFullscreen }">
    <!-- 生成过渡遮罩 -->
    <div v-if="home.generating" class="gen">
      <div class="gen__ring"></div>
      <div class="gen__bar">
        <div class="gen__bar-fill" :style="{ width: home.genProg + '%' }"></div>
      </div>
      <div class="gen__text">AI 正在为你搭配… {{ home.genProg }}%</div>
    </div>

    <HomeGuidePanel v-else-if="!home.outfitReady" :facts="guideFacts" @action="handleGuideAction" />

    <template v-else>
      <!-- 4.1 顶部问候栏 -->
      <PageHeader title="今日">
        <!-- <template #action>
          <button class="avatar-btn" aria-label="我的" @click="goProfile">
            <AppIcon name="user" :size="22" />
          </button>
        </template> -->
      </PageHeader>

      <DemoHint>测试账号的性别和肤色分别固定为「女」和「小麦色」，暂时无法更改</DemoHint>

      <!-- 4.2 HERO 大卡：紧凑态与全屏态共用同一套 DOM -->
      <div class="hero-slot">
        <section
          ref="heroEl"
          class="hero"
          :class="{
            'hero--sunny': heroWeatherCondition === 'sunny',
            'hero--cloudy': heroWeatherCondition === 'cloudy',
            'hero--rainy': heroWeatherCondition === 'rainy',
            'hero--interactive': canExpandHero && !isHeroFullscreen,
            'hero--fullscreen': isHeroFullscreen,
            'hero--animating': heroAnimating,
          }"
          :style="{ backgroundImage: heroSky }"
          :role="canExpandHero && !isHeroFullscreen ? 'button' : undefined"
          :tabindex="canExpandHero && !isHeroFullscreen ? 0 : undefined"
          :aria-label="canExpandHero && !isHeroFullscreen ? '打开今日穿搭全屏浏览' : undefined"
          @click="openHero"
          @keydown.enter.prevent="openHero"
          @keydown.space.prevent="openHero"
        >
          <WeatherCanvas
            v-if="isHeroFullscreen"
            class="hero__weather-canvas"
            :condition="heroWeatherCondition"
            :collider-el="heroCardEl"
            :animating="heroAnimating"
            :daylight="heroDaylight"
          />

          <!-- 4.2a 顶部状态行 -->
          <div class="hero__status">
            <div class="hero__weather">
              <div class="hero__temp">{{ weather?.temp ?? '—' }}°</div>
              <div class="hero__desc">{{ weather?.condition }}</div>
            </div>
            <div v-if="!isHeroFullscreen" class="hero__occasion">
              <div class="hero__occasion-name">{{ occasionName }}</div>
              <div class="hero__occasion-date">{{ dateText }}</div>
            </div>
            <button
              v-else
              ref="heroCloseButtonEl"
              class="hero__close"
              aria-label="退出全屏浏览"
              @click.stop="closeHero"
            >
              <AppIcon name="close" :size="22" />
            </button>
          </div>

          <!-- 4.2b 中部穿搭插画 -->
          <div v-if="tryTrying" class="hero__trying">
            <div class="hero__spinner"></div>
            <div class="hero__trying-text">生成上身图 {{ tryProgress }}%</div>
          </div>
          <div
            v-else-if="heroImage"
            :class="isHeroFullscreen ? 'hero__art--fullscreen' : 'hero__art'"
          >
            <img :src="heroImage" class="hero__real" alt="今日穿搭上身图" />
            <!-- <div v-else-if="heroGarments.length" class="hero__art-collage">
            <img
              v-for="g in heroGarments"
              :key="g.id"
              :src="g.display_image_url"
              class="hero__art-img"
              alt=""
            />
          </div> -->
          </div>
          <AppIcon v-else name="dress" :size="96" class="hero__art-icon" />

          <button
            v-if="canExpandHero && !isHeroFullscreen"
            class="hero__expand"
            aria-label="全屏查看今日穿搭"
            @click.stop="openHero"
          >
            <AppIcon name="expand-arrows" :size="26" />
          </button>

          <!-- 4.2c 底部毛玻璃 hint 卡 -->
          <div ref="heroCardEl" :class="isHeroFullscreen ? 'hero__card--fullscreen' : 'hero__card'">
            <div class="hero__card-top">
              <div class="hero__card-info">
                <div class="hero__card-title">{{ outfitTitle }}</div>
                <div class="hero__tags">
                  <span v-for="tag in outfitTags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
              <button
                class="heart-btn"
                aria-label="收藏"
                @click.stop="addToLike(currentOutfit?.id)"
              >
                <AppIcon name="heart" :size="25" />
              </button>
            </div>
            <div v-if="outfitHint" class="hero__divider"></div>
            <div v-if="outfitHint" class="hero__hint">
              <AppIcon name="bulb" :size="15" />
              <span>{{ outfitHint }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 4.3 搭配清单：横向滚动缩略图（独立白卡）-->
      <section v-if="pieces.length" class="pieces">
        <div class="pieces__scroll">
          <div v-for="piece in pieces" :key="piece.id" class="piece">
            <div class="piece__thumb">
              <GarmentThumb :src="piece.display_image_url" :icon-size="26" />
            </div>
            <div class="piece__name">{{ pieceName(piece) }}</div>
          </div>
        </div>
      </section>

      <!-- 4.4 动作行 -->
      <section class="actions">
        <button
          class="action action--soft"
          @click="regenerateOutfit"
          :disabled="!home.canGenerate || home.generating"
        >
          <AppIcon name="refresh" :size="22" />
          <div class="action__text">
            <div class="action__title">快速换装</div>
            <div class="action__sub">AI 帮你选</div>
          </div>
        </button>
        <button class="action action--solid" @click="goWorkshop">
          <AppIcon name="scissors" :size="22" />
          <div class="action__text">
            <div class="action__title">自由搭配</div>
            <div class="action__sub">自己动手改</div>
          </div>
        </button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import AppIcon from '@/components/icons/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import GarmentThumb from '@/components/GarmentThumb.vue';
import { ROUTES } from '@/constants/routes';
import { useHomeStore } from '@/stores/home';
import { useWardrobeStore } from '@/stores/wardrobe';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import type { OutfitGarment } from '@/api/types/outfits';
import { useWeather } from '@/composables/useWeather';
import DemoHint from '@/components/DemoHint.vue';
// import { useTryOn } from '@/composables/useTryOn';
import { saveOutfit } from '@/api/userOutfits';
import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import { useNotifyStore } from '@/stores/notify';
import { useProfileStore } from '@/stores/profile';
import HomeGuidePanel from '@/components/home-guide/HomeGuidePanel.vue';
import WeatherCanvas from '@/components/WeatherCanvas.vue';
import { useHeroFullscreen } from '@/composables/useHeroFullscreen';
import type { HomeGuideAction, HomeGuideFacts } from '@/components/home-guide/homeGuideFlow';

const router = useRouter();
const notify = useNotifyStore();

const auth = useAuthStore();
const { loggedIn } = storeToRefs(auth);

const home = useHomeStore();
const { outfits } = storeToRefs(home);
const { generate, loadTodayOutfits, persistToday } = home;

// canGenerate 依赖 wardrobe.hasClothes，而 hasClothes 只有在 wardrobe.fetch() 跑过后才准。所以进首页要先 wardrobe.fetch()，否则"明明有衣服，按钮却是灰的"（因为 items 还是空数组）。
const wardrobe = useWardrobeStore();
const { getClothes } = wardrobe;

const profile = useProfileStore();
const { fetchProfile } = profile;

const { weather, load: loadWeather } = useWeather();

onMounted(() => {
  if (auth.loggedIn) void loadWeather();
});

watch(
  loggedIn,
  async (isLoggedIn) => {
    if (isLoggedIn)
      await Promise.all([getClothes(), loadTodayOutfits(), fetchProfile(), loadWeather()]);
  },
  { immediate: true },
);

const guideFacts = computed<HomeGuideFacts>(() => ({
  loggedIn: auth.loggedIn,

  // FUTURE：接入 Model API/Store 后，替换成 missing / generating / ready 真实状态。
  modelStatus: auth.user?.avatar_url ? 'ready' : 'missing',
  modelProgress: 0,

  hasClothes: wardrobe.hasClothes,
}));

// 顶部日期，如「周三 · 7月8日」
const dateText = computed(() => {
  const now = new Date();
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
  return `${week} · ${now.getMonth() + 1}月${now.getDate()}日`;
});

// ==================== 加载/保存 今日穿搭数据 ====================

// 把「当前正在看的这套」设为今日；去重，避免多事件重复发
let lastPersisted: string | null = null;
function persistCurrentToday() {
  const id = currentOutfit.value?.id;
  if (!home.outfitReady || !id || id === lastPersisted) return;
  lastPersisted = id;
  void persistToday(id);
}
function onVisibility() {
  if (document.visibilityState === 'hidden') persistCurrentToday(); // 退后台
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', persistCurrentToday); // 退出 / 关页
});
onBeforeUnmount(() => {
  persistCurrentToday(); // 卸载也存一次
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('pagehide', persistCurrentToday);
});
onBeforeRouteLeave(() => {
  persistCurrentToday(); // 切 tab / 进工坊等路由离开
});

// ==================== HERO 展示数据 ====================

// ----- 今日穿搭展示数据：从 store 的 outfits[0] + weather 派生（全带兜底）-----
const avatarUrl = computed(() => auth.user?.avatar_url ?? null);
const outfitsSize = computed(() => outfits.value.length ?? 0);
const outfitsCurrentIndex = ref<number>(0);
const currentOutfit = computed(() => outfits.value[outfitsCurrentIndex.value] ?? null);
const outfitTitle = computed(
  () => currentOutfit.value?.name ?? currentOutfit.value?.occasion ?? '今日推荐',
);
const occasionName = computed(() => currentOutfit.value?.occasion ?? '');
const outfitTags = computed(() => currentOutfit.value?.tags_en ?? []);
const outfitHint = computed(
  () => currentOutfit.value?.tips?.[0] ?? currentOutfit.value?.reason ?? '',
);
// const heroGarments = computed(() => {
//   return currentOutfit.value?.garments.slice(0, 3) ?? [];
// });

// const {
//   trying: tryTrying,
//   progress: tryProgress,
//   image: heroImage,
//   reset: resetTryon,
//   tryOutfit,
// } = useTryOn();

// const tryCache = new Map<string, string>(); // outfitId -> 上身图，换来换去不重复生成

// watch(
//   currentOutfit,
//   async (o) => {
//     resetTryon();
//     if (!o || !auth.user?.avatar_url) return; // 没模特 → 只显拼贴（去工坊生成模特后才有上身图）
//     const cached = tryCache.get(o.id);
//     if (cached) {
//       heroImage.value = cached;
//       return;
//     } // 命中缓存
//     const ok = await tryOutfit(o.id); // 后台跑，几分钟；不阻塞页面
//     if (ok && heroImage.value) tryCache.set(o.id, heroImage.value);
//   },
//   { immediate: true },
// );

const currentOutfitId = computed(() => currentOutfit.value?.id ?? null);

const heroImage = computed(() =>
  currentOutfitId.value ? (home.tryOnImages[currentOutfitId.value] ?? null) : null,
);

const heroEl = ref<HTMLElement | null>(null);
const heroCardEl = ref<HTMLElement | null>(null);
const heroCloseButtonEl = ref<HTMLButtonElement | null>(null);
const canExpandHero = computed(() => Boolean(heroImage.value));
const heroWeatherCondition = computed<'sunny' | 'cloudy' | 'rainy'>(() => {
  const condition = (weather.value?.condition ?? '').toLowerCase();
  if (condition.includes('雨') || condition.includes('rain')) return 'rainy';
  if (
    condition.includes('云') ||
    condition.includes('阴') ||
    condition.includes('cloud') ||
    condition.includes('overcast')
  )
    return 'cloudy';
  return 'sunny';
});
// const heroWeatherCondition: 'sunny' | 'cloudy' | 'rainy' = 'rainy';
// 天气 × 时段 的天空渐变（top→bottom），可自行调色
const SKY: Record<
  'sunny' | 'cloudy' | 'rainy',
  Record<'dawn' | 'day' | 'dusk' | 'night', string>
> = {
  sunny: {
    dawn: 'linear-gradient(168deg,#f7c7a8,#f3d9d0 45%,#e8e0f0)',
    day: 'linear-gradient(168deg,#bfd6f5,#dce7f7 44%,#efe9fb)',
    dusk: 'linear-gradient(168deg,#f0a878,#d98db0 50%,#6b6b9e)',
    night: 'linear-gradient(168deg,#1e2748,#2c3a63 55%,#4a5a86)',
  },
  cloudy: {
    dawn: 'linear-gradient(168deg,#cfc2c0,#dcd6da 50%,#e6e6ee)',
    day: 'linear-gradient(168deg,#c3c7cf,#d9dce3 50%,#eef0f4)',
    dusk: 'linear-gradient(168deg,#a89aa0,#9a93ab 50%,#6f6f8c)',
    night: 'linear-gradient(168deg,#20242f,#333a48 55%,#4a5262)',
  },
  rainy: {
    dawn: 'linear-gradient(168deg,#8f92a6,#a6acc0 50%,#c4cad8)',
    day: 'linear-gradient(168deg,#8593ad,#aab6c9 50%,#cfd6e2)',
    dusk: 'linear-gradient(168deg,#6d7488,#7c81a0 50%,#565a78)',
    night: 'linear-gradient(168deg,#161b28,#29303f 55%,#3c4557)',
  },
};
const heroSky = computed(() => {
  const hour = new Date().getHours();
  const tod = hour < 5 || hour >= 20 ? 'night' : hour < 8 ? 'dawn' : hour < 17 ? 'day' : 'dusk';
  return SKY[heroWeatherCondition.value][tod];
});
const heroDaylight = computed(() => {
  const h = new Date().getHours();
  if (h < 5 || h >= 20) return 0; // 夜
  if (h < 7 || h >= 18) return 0.4; // 晨/暮
  return 1; // 昼
});

const {
  isFullscreen: isHeroFullscreen,
  isAnimating: heroAnimating,
  open: openHero,
  close: closeHero,
} = useHeroFullscreen({ heroEl, canOpen: canExpandHero });

let shouldRestoreHeroFocus = false;
let heroBodyOverflowBeforeOpen: string | null = null;

function lockHeroBodyScroll() {
  if (heroBodyOverflowBeforeOpen !== null) return;
  heroBodyOverflowBeforeOpen = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function restoreHeroBodyScroll() {
  if (heroBodyOverflowBeforeOpen === null) return;
  document.body.style.overflow = heroBodyOverflowBeforeOpen;
  heroBodyOverflowBeforeOpen = null;
}

watch(isHeroFullscreen, async (fullscreen) => {
  if (fullscreen) lockHeroBodyScroll();
  else restoreHeroBodyScroll();

  await nextTick();
  if (fullscreen) {
    shouldRestoreHeroFocus = true;
    heroCloseButtonEl.value?.focus({ preventScroll: true });
  } else if (shouldRestoreHeroFocus) {
    shouldRestoreHeroFocus = false;
    heroEl.value?.focus({ preventScroll: true });
  }
});

onBeforeUnmount(restoreHeroBodyScroll);

const tryTrying = computed(() => {
  return currentOutfitId.value ? home.tryOnLoading[currentOutfitId.value] === true : false;
});

const tryProgress = computed(() =>
  currentOutfitId.value ? (home.tryOnProgress[currentOutfitId.value] ?? 0) : 0,
);

// watch(
//   currentOutfitId,
//   (id) => {
//     if (!id || !auth.user?.avatar_url) return;
//     void home.ensureOutfitTryOnImage(id);
//   },
//   { immediate: true },
// );

watch(
  [currentOutfitId, avatarUrl],
  ([id, avatar]) => {
    if (!id || !avatar) return;
    void home.ensureOutfitTryOnImage(id);
  },
  { immediate: true },
);

// 搭配单品
const pieces = computed(() => currentOutfit.value?.garments ?? []);
const pieceName = (g: OutfitGarment) => `${g.primary_color ?? ''}${g.category}`;

async function addToLike(id: string | undefined) {
  if (!auth.loggedIn) {
    auth.openAuth();
    return;
  }
  const o = currentOutfit.value;
  if (!id || !o) return;
  try {
    await saveOutfit({
      name: o.name ?? o.occasion ?? '今日穿搭',
      occasion_en: o.occasion_en,
      garment_ids: o.garments.map((g) => g.id),
      source_en: 'tag5_result',
      ...(o.tags_en?.length && { tags_en: o.tags_en }),
    });
    notify.success('已收藏到偏好');
  } catch (e) {
    notify.error(e instanceof AppError ? messageFromError(e) : '收藏失败');
  }
}

async function regenerateOutfit() {
  // 换装时先考虑 outfits 组内的 outfit，组内的 outfit 消耗完后，再考虑重新 generate
  if (outfitsCurrentIndex.value < outfitsSize.value - 1) {
    console.log(outfitsCurrentIndex.value);
    outfitsCurrentIndex.value++;
    console.log(outfitsSize.value);
  } else {
    // store 内部已 guard，页面不用再判
    await generate();
    outfitsCurrentIndex.value = 0;
  }
}

// ==================== 导航 ====================

// 导航我们不关心结果，最干净的写法是用 void 明确标记
function goProfile() {
  void router.push({ name: ROUTES.profile }); // void：告诉 eslint「我故意不 await」
}

function goBodyData() {
  void router.push({ name: ROUTES.bodyData });
}

function goWorkshop() {
  void router.push({ name: ROUTES.workshop });
}

function goWardrobe() {
  void router.push({ name: ROUTES.wardrobe });
}

function handleGuideAction(action: HomeGuideAction) {
  if (action === 'login') {
    auth.openAuth('login');
    return;
  }

  if (action === 'create-model') {
    goBodyData();
    return;
  }

  if (action === 'open-wardrobe') {
    goWardrobe();
    return;
  }

  if (action === 'generate-tryon') void generate();
}
</script>

<style scoped lang="scss">
// 根容器（同时是 .page-slot：已是撑满屏的 flex 竖列）——加块间距
.home {
  gap: 18px;
}
.home--hero-fullscreen {
  gap: 0;
  padding: 0;
  overflow: hidden;
}

// ===== 生成过渡遮罩 =====
.gen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 0 40px;
}
.gen__ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--primary-soft);
  border-top-color: var(--primary); // 缺口染主色 → 转起来像 spinner
  animation: vc-spin 0.8s linear infinite;
}
.gen__bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--bg-fill);
  overflow: hidden;
}
.gen__bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-pill);
  transition: width 0.2s ease; // 进度平滑增长
}
.gen__text {
  font-size: 14px;
  color: var(--text-gray);
}
@keyframes vc-spin {
  to {
    transform: rotate(360deg);
  }
}

// 头像按钮
.avatar-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  &:active {
    transform: scale(0.92);
  }
}

// ===== 4.2 HERO =====
.hero-slot {
  position: relative;
  flex: 1;
  min-height: 350px;
}
.hero {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 350px;
  padding: 20px;
  border-radius: var(--radius-hero);
  overflow: hidden;
  box-shadow: var(--shadow-hero);
  display: flex;
  flex-direction: column;
}
.hero--interactive {
  cursor: zoom-in;
}
.hero--interactive:focus-visible {
  outline: 3px solid rgba(74, 79, 176, 0.32);
  outline-offset: 3px;
}
.hero--animating {
  will-change: transform, border-radius;
}
.hero--fullscreen {
  justify-content: space-between;
  position: fixed;
  inset: 0;
  z-index: 1200;
  width: 100vw;
  height: 100dvh;
  min-height: 100dvh;
  padding: calc(18px + var(--safe-top)) 18px calc(18px + var(--safe-bottom));
  border-radius: 0;
  box-shadow: none;
  cursor: default;
}
.hero--sunny {
  background: linear-gradient(168deg, #bfd6f5, #dce7f7 44%, #efe9fb);
  // background: var(--bg-main);
}
.hero--cloudy {
  background: linear-gradient(168deg, #c3c7cf, #d9dce3 50%, #eef0f4);
}
.hero--rainy {
  background: linear-gradient(168deg, #8593ad, #aab6c9 50%, #cfd6e2);
}
.hero__weather-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.hero--sunny .hero__weather-canvas {
  z-index: 0;
}
.hero--cloudy .hero__weather-canvas {
  z-index: 0;
}
.hero--rainy .hero__weather-canvas {
  z-index: 2;
}
.hero__status {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 4;
}
.hero__temp {
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  color: var(--text-dark);
}
.hero__desc {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gray);
}
.hero__occasion {
  text-align: right;
}
.hero__occasion-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-dark);
}
.hero__occasion-date {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-gray);
}
.hero__close,
.hero__expand {
  border: 1px solid rgba(255, 255, 255, 0.48);
  display: grid;
  place-items: center;
  color: var(--text-dark);
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 10px 30px -18px rgba(32, 39, 82, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.hero__close {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0);
  border: 0;
}
.hero__expand {
  position: absolute;
  z-index: 4;
  top: 35%;
  right: 20px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
}
.hero__close:active,
.hero__expand:active {
  transform: scale(0.92);
}
.hero__art {
  position: absolute;
  width: 100%;
  height: 100%;
  // inset: 0;
  top: 0;
  left: 0;
  right: 0;
  flex: 1;
  z-index: 1;
  min-height: 0;
  display: flex;
  align-items: start;
  justify-content: center;
  border-radius: var(--radius-hero);
  overflow: hidden;
}
.hero__art--fullscreen {
  min-height: 0;
  display: flex;
  align-items: start;
  justify-content: center;
  border-radius: var(--radius-hero);
  overflow: hidden;
  flex-shrink: 1;
  z-index: 0;
  filter: drop-shadow(var(--shadow-hero-fullscreen));
}
// .hero--fullscreen .hero__art {
//   inset: calc(var(--safe-top) + 70px) 12px calc(var(--safe-bottom) + 172px);
// }
.hero__art-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
  color: var(--primary);
  opacity: 0.92;
  filter: drop-shadow(0 8px 18px rgba(108, 92, 231, 0.25));
}
.hero__art-collage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.hero__art-img {
  max-height: 150px;
  max-width: 34%;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(80, 90, 140, 0.25));
}
.hero__real {
  width: 100%;
  // height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 24px rgba(80, 90, 140, 0.3));
}
.hero--fullscreen .hero__real {
  filter: drop-shadow(0 18px 34px rgba(52, 61, 112, 0.24));
}
.hero__trying {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -80%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.hero__spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: var(--primary);
  animation: vc-spin 0.8s linear infinite;
}
.hero__trying-text {
  font-size: 13px;
  color: var(--text-gray);
}
.hero__card {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  border-radius: var(--radius-md);
  padding: 12px 10px;
}
.hero__card--fullscreen {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  border-radius: var(--radius-md);
  padding: 12px 10px;
  // border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: var(--shadow-card-fullscreen);
  filter: drop-shadow(var(--shadow-card-fullscreen));
}
// .hero--fullscreen .hero__card {
//   right: auto;
//   bottom: calc(12px + var(--safe-bottom));
//   left: 50%;
//   width: min(calc(100% - 32px), 520px);
//   padding: 17px 18px;
//   border: 1px solid rgba(255, 255, 255, 0.52);
//   background: rgba(255, 255, 255, 0.74);
//   box-shadow: 0 18px 48px -26px rgba(24, 31, 74, 0.72);
//   backdrop-filter: blur(24px) saturate(1.12);
//   -webkit-backdrop-filter: blur(24px) saturate(1.12);
//   transform: translateX(-50%);
// }
.hero--fullscreen .hero__card-title {
  font-size: 21px;
}
.hero__card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.hero__card-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-dark);
}
.hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.tag {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}
.heart-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--button-primary-border);
  border-radius: 50%;
  background: var(--gradient-button-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-cta);
  cursor: pointer;
  &:active {
    transform: scale(0.9);
  }
}
.hero__divider {
  height: 1px;
  background: var(--hairline);
  margin: 12px 0;
}
.hero__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-gray);
  font-size: 12px;
  line-height: 1.5;
}

// ===== 4.3 搭配清单（缩小版）=====
.pieces {
  padding: 12px; // 原 14 → 12
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.pieces__scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.piece {
  flex-shrink: 0;
  width: 56px; // 原 68 → 56
}
.piece__thumb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  overflow: hidden; // 让 GarmentThumb 的白底描边裁切跟随圆角
}
.piece__name {
  margin-top: 5px;
  font-size: 10px;
  color: var(--text-gray);
  text-align: center;
}

// ===== 4.4 动作行 =====
.actions {
  display: flex;
  gap: 12px;
}
.action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center; // 图标+文字整体居中
  gap: 10px;
  // 右 padding 比左大 → 居中区域左移 → 内容整体偏左，平衡右侧两行字的视觉重量
  padding: 14px 22px 14px 14px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: transform 0.15s;
  &:active {
    transform: scale(0.97);
  }
}
.action--soft {
  border: 1px solid var(--button-secondary-border);
  background: var(--gradient-button-secondary);
  color: var(--primary);
}
.action--solid {
  border: 1px solid var(--button-primary-border);
  background: var(--gradient-button-primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
.action__title {
  font-size: 15px;
  font-weight: 700;
}
.action__sub {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.75;
  margin-top: 1px;
}

@media (max-height: 640px) and (orientation: landscape) {
  .hero--fullscreen .hero__art {
    inset: calc(var(--safe-top) + 54px) 130px calc(var(--safe-bottom) + 20px) 18px;
  }
  .hero--fullscreen .hero__card {
    right: 18px;
    bottom: calc(12px + var(--safe-bottom));
    left: auto;
    width: min(38vw, 420px);
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero--animating {
    will-change: auto;
  }
}
</style>

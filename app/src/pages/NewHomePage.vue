<template>
  <div class="home">
    <!-- 生成过渡遮罩 -->
    <div v-if="home.generating" class="gen">
      <div class="gen__ring"></div>
      <div class="gen__bar">
        <div class="gen__bar-fill" :style="{ width: home.genProg + '%' }"></div>
      </div>
      <div class="gen__text">AI 正在为你搭配… {{ home.genProg }}%</div>
    </div>

    <!-- 未生成 → Welcome 引导（§1.0）-->
    <div v-else-if="!home.outfitReady" class="welcome">
      <div class="welcome__logo">
        <AppIcon name="sparkle" :size="30" />
      </div>
      <h1 class="welcome__slogan">告别「今天穿什么」的烦恼</h1>
      <p class="welcome__sub">登录、上传衣物，AI 每天帮你搭配</p>

      <DemoHint
        >测试账号中已满足第 2 条和第 3
        条要求，因此该页面会即刻消失，但您仍可前往「电子衣柜」上传衣服，也可前往「我的」修改个人数据</DemoHint
      >

      <div class="steps">
        <button class="step" @click="auth.openAuth('register')">
          <span class="step__badge" :class="{ 'step__badge--done': auth.loggedIn }">
            <AppIcon v-if="auth.loggedIn" name="check" :size="15" />
            <template v-else>1</template>
          </span>
          <span class="step__label">注册账号</span>
        </button>
        <button class="step" @click="goProfile">
          <span class="step__badge" :class="{ 'step__badge--done': auth.loggedIn }">
            <AppIcon v-if="auth.loggedIn" name="check" :size="15" />
            <template v-else>2</template>
          </span>
          <span class="step__label">填写身体数据</span>
        </button>
        <button class="step" @click="goWardrobe">
          <span class="step__badge" :class="{ 'step__badge--done': wardrobe.hasClothes }">
            <span v-if="wardrobe.loading" class="badge-spinner"></span>
            <AppIcon v-else-if="wardrobe.hasClothes" name="check" :size="15" />
            <template v-else>3</template>
          </span>
          <span class="step__label">拍照上传衣物</span>
        </button>
      </div>

      <button class="gen-btn" :disabled="!home.canGenerate" @click="home.generate()">
        让我来告诉你
      </button>
      <div v-if="!home.canGenerate" class="welcome__hint">{{ gateHint }}</div>
    </div>

    <template v-else>
      <!-- 4.1 顶部问候栏 -->
      <PageHeader title="今日穿搭">
        <template #action>
          <button class="avatar-btn" aria-label="我的" @click="goProfile">
            <AppIcon name="user" :size="22" />
          </button>
        </template>
      </PageHeader>

      <!-- 4.2 HERO 大卡 -->
      <section class="hero hero--sunny">
        <!-- 4.2a 顶部状态行 -->
        <div class="hero__status">
          <div class="hero__weather">
            <div class="hero__temp">{{ weather?.temp ?? '—' }}°</div>
            <div class="hero__desc">{{ weather?.condition }}</div>
          </div>
          <div class="hero__occasion">
            <div class="hero__occasion-name">{{ occasionName }}</div>
            <div class="hero__occasion-date">{{ dateText }}</div>
          </div>
        </div>

        <!-- 4.2b 中部穿搭插画 -->
        <div v-if="tryTrying" class="hero__trying">
          <div class="hero__spinner"></div>
          <div class="hero__trying-text">生成上身图 {{ tryProgress }}%</div>
        </div>
        <div v-else-if="heroImage" class="hero__art">
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

        <!-- 4.2c 底部毛玻璃 hint 卡 -->
        <div class="hero__card">
          <div class="hero__card-top">
            <div class="hero__card-info">
              <div class="hero__card-title">{{ outfitTitle }}</div>
              <div class="hero__tags">
                <span v-for="tag in outfitTags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <button class="heart-btn" aria-label="收藏" @click="addToLike(currentOutfit?.id)">
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
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
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
import { useTryOn } from '@/composables/useTryOn';
import { saveOutfit } from '@/api/userOutfits';
import { AppError } from '@/errors';
import { messageFromError } from '@/utils/errorMessage';
import { useNotifyStore } from '@/stores/notify';

const router = useRouter();
const auth = useAuthStore();
const notify = useNotifyStore();

const home = useHomeStore();
const { outfits } = storeToRefs(home);
const { generate, loadToday, persistToday } = home;

// canGenerate 依赖 wardrobe.hasClothes，而 hasClothes 只有在 wardrobe.fetch() 跑过后才准。所以进首页要先 wardrobe.fetch()，否则"明明有衣服，按钮却是灰的"（因为 items 还是空数组）。
const wardrobe = useWardrobeStore();
const { getClothes } = wardrobe;

const { weather, load: loadWeather } = useWeather();

onMounted(async () => {
  // void getClothes();
  // void loadToday();
  await Promise.all([wardrobe.getClothes(), loadToday()]); // 并行、都 await；loadToday 不抛错
  if (!home.outfitReady && home.canGenerate) {
    await generate(); // 没今日穿搭 & 能生成 → 自动来一套
  }
  if (auth.loggedIn) void loadWeather();
});

// 生成闸门"还差哪一步"的提示
const gateHint = computed(() =>
  !auth.loggedIn ? '请先注册账号' : !wardrobe.hasClothes ? '请先上传至少一件衣物' : '',
);

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
const currentOutfit = computed(() => outfits.value[0] ?? null);
console.log(currentOutfit.value);
const avatarUrl = computed(() => auth.user?.avatar_url ?? null);

const outfitTitle = computed(
  () => currentOutfit.value?.name ?? currentOutfit.value?.occasion ?? '今日推荐',
);
const occasionName = computed(() => currentOutfit.value?.occasion ?? '');
const outfitTags = computed(() => currentOutfit.value?.tags_en ?? []);
const outfitHint = computed(
  () => currentOutfit.value?.tips?.[0] ?? currentOutfit.value?.reason ?? '',
);
const heroGarments = computed(() => {
  console.log(currentOutfit.value);
  return currentOutfit.value?.garments.slice(0, 3) ?? [];
});

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
console.log(currentOutfitId.value);

const heroImage = computed(() =>
  currentOutfitId.value ? (home.tryOnImages[currentOutfitId.value] ?? null) : null,
);

const tryTrying = computed(() => {
  console.log(currentOutfitId.value);
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
  // store 内部已 guard，页面不用再判
  await generate();
  console.log(outfits);
}

// ==================== 导航 ====================

// 导航我们不关心结果，最干净的写法是用 void 明确标记
function goProfile() {
  void router.push({ name: ROUTES.profile }); // void：告诉 eslint「我故意不 await」
}

function goWorkshop() {
  void router.push({ name: ROUTES.workshop });
}

function goWardrobe() {
  void router.push({ name: ROUTES.wardrobe });
}
</script>

<style scoped lang="scss">
// 根容器（同时是 .page-slot：已是撑满屏的 flex 竖列）——加块间距
.home {
  gap: 18px;
}

// ===== Welcome 引导（未生成时）=====
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 20px;
}
.welcome__logo {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-cta);
}
.welcome__slogan {
  margin-top: 20px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--text-dark);
}
.welcome__sub {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-gray);
}
.steps {
  width: 100%;
  margin: 28px 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  &:active {
    transform: scale(0.98);
  }
}
.step__badge {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-fill);
  color: var(--text-gray);
  font-size: 13px;
  font-weight: 700;
}
.step__badge--done {
  background: var(--primary);
  color: #fff;
}
.badge-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--hairline);
  border-top-color: var(--text-gray);
  animation: vc-spin 0.7s linear infinite;
}
.step__label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dark);
}
.gen-btn {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  box-shadow: var(--shadow-cta);
  cursor: pointer;
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    background: #e4e4e8; // 差一步：置灰不可点
    color: var(--text-light);
    box-shadow: none;
    cursor: default;
  }
}
.welcome__hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-gray);
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
.hero {
  position: relative;
  flex: 1; // 吃掉剩余空间，随屏幕大小自适应
  min-height: 320px; // 兜底
  padding: 20px;
  border-radius: var(--radius-hero);
  overflow: hidden;
  box-shadow: var(--shadow-hero);
  display: flex;
  flex-direction: column;
}
.hero--sunny {
  background: linear-gradient(168deg, #bfd6f5, #dce7f7 44%, #efe9fb);
}
.hero__status {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 2;
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
.hero__art {
  position: absolute;
  top: 0;
  left: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
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
  max-height: 100%;
  max-width: 100%;
  // width: 100%;
  // height: 100%;
  // max-height: none;
  // max-width: none;
  object-fit: contain;
  filter: drop-shadow(0 10px 24px rgba(80, 90, 140, 0.3));
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
  left: 20px;
  right: 20px;
  bottom: 20px;
  z-index: 3;

  background: rgba(255, 255, 255, 0);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: var(--radius-md);
  padding: 14px 16px;
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
  border: none;
  border-radius: 50%;
  background: var(--primary);
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
  background: var(--primary-soft);
  color: var(--primary);
}
.action--solid {
  background: var(--primary);
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
</style>

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
      <div class="welcome__logo"><AppIcon name="sparkle" :size="30" /></div>
      <h1 class="welcome__slogan">告别「今天穿什么」的烦恼</h1>
      <p class="welcome__sub">登录、上传衣物，AI 每天帮你搭配</p>

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
            <AppIcon v-if="wardrobe.hasClothes" name="check" :size="15" />
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

    <!-- 4.1 顶部问候栏 -->
    <template v-else>
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
            <div class="hero__temp">{{ weather.temp }}°</div>
            <div class="hero__desc">{{ weather.desc }}</div>
          </div>
          <div class="hero__occasion">
            <div class="hero__occasion-name">{{ occasion.name }}</div>
            <!-- <div class="hero__occasion-date">{{ occasion.date }}</div> -->
            <div class="hero__occasion-date">{{ dateText }}</div>
          </div>
        </div>

        <!-- 4.2b 中部穿搭插画 -->
        <div class="hero__art">
          <AppIcon name="dress" :size="96" class="hero__art-icon" />
        </div>

        <!-- 4.2c 底部毛玻璃 hint 卡 -->
        <div class="hero__card">
          <div class="hero__card-top">
            <div class="hero__card-info">
              <div class="hero__card-title">{{ outfit.name }}</div>
              <div class="hero__tags">
                <span v-for="tag in outfit.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <button class="spark-btn" aria-label="换一套">
              <AppIcon name="sparkle" :size="18" />
            </button>
          </div>
          <div class="hero__divider"></div>
          <div class="hero__hint">
            <AppIcon name="bulb" :size="15" />
            <span>{{ outfit.hint }}</span>
          </div>
        </div>
      </section>

      <!-- 4.3 搭配清单：横向滚动缩略图（独立白卡）-->
      <section class="pieces">
        <div class="pieces__scroll">
          <div v-for="piece in pieces" :key="piece.name" class="piece">
            <div class="piece__thumb">
              <GarmentThumb :name="piece.name" :icon="piece.icon" :icon-size="26" />
            </div>
            <div class="piece__name">{{ piece.name }}</div>
          </div>
        </div>
      </section>

      <!-- 4.4 动作行 -->
      <section class="actions">
        <button class="action action--soft" @click="refreshOutfit">
          <AppIcon name="refresh" :size="22" />
          <div class="action__text">
            <div class="action__title">换一套</div>
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
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/icons/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import GarmentThumb from '@/components/GarmentThumb.vue';
import { ROUTES } from '@/constants/routes';
import type { IconName } from '@/components/icons/icons';
import { useHomeStore } from '@/stores/home';
import { useWardrobeStore } from '@/stores/wardrobe';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();

const auth = useAuthStore();

const home = useHomeStore();
const { outfitReady, generating, genProg, canGenerate } = storeToRefs(home);
const { generate } = home;

// canGenerate 依赖 wardrobe.hasClothes，而 hasClothes 只有在 wardrobe.fetch() 跑过后才准。所以进首页要先 wardrobe.fetch()，否则"明明有衣服，按钮却是灰的"（因为 items 还是空数组）。
const wardrobe = useWardrobeStore();
onMounted(() => {
  void wardrobe.getClothes();
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

// HERO 展示数据（先写死；后续接真实天气/推荐）
const weather = { temp: 24, desc: '晴 · 微风' };
const occasion = { name: '简约通勤', date: '今天' };
const outfit = {
  name: '简约通勤',
  tags: ['白衬衫', '卡其西裤', '乐福鞋'],
  hint: '今天有小雨，建议带一件防水外套。',
};

// 搭配单品（icon 暂用 dress 占位；真实项目按品类配衬衫/裤子/鞋等图标）
const pieces: { name: string; icon: IconName }[] = [
  { name: '白衬衫', icon: 'dress' },
  { name: '卡其西裤', icon: 'dress' },
  { name: '乐福鞋', icon: 'dress' },
  { name: '风衣', icon: 'dress' },
  { name: '手表', icon: 'dress' },
];

// async function goProfile() {
//   await router.push({ name: ROUTES.profile });
// }
// 导航我们不关心结果，最干净的写法是用 void 明确标记
function goProfile() {
  void router.push({ name: ROUTES.profile }); // void：告诉 eslint「我故意不 await」
}

function refreshOutfit() {
  /* TODO: 在预设方案间循环，待接推荐 */
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero__art-icon {
  color: var(--primary);
  opacity: 0.92;
  filter: drop-shadow(0 8px 18px rgba(108, 92, 231, 0.25));
}
.hero__card {
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
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
.spark-btn {
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

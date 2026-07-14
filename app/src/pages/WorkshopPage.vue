<template>
  <div class="workshop">
    <!-- 顶栏 -->
    <!-- <header class="ws-top">
      <button class="ws-top__btn" aria-label="返回" @click="goBack">
        <AppIcon name="chevron-left" :size="22" />
      </button>
      <div class="ws-top__title">自由搭配</div>
      <button class="ws-top__save" :disabled="ws.isEmpty" @click="openSave">保存</button>
    </header> -->
    <PageHeader title="自由搭配" back @back="goBack">
      <template #action>
        <button class="ws-save" :disabled="ws.isEmpty" @click="openSave">保存</button>
      </template>
    </PageHeader>

    <div class="ws-context">
      <AppIcon name="tag" :size="14" />
      自由搭配 · 从衣柜挑单品上身
    </div>

    <!-- 试衣画布 -->
    <div class="canvas">
      <!-- AI 换装遮罩（生成模特 / 试穿中）-->
      <div v-if="ws.trying" class="canvas__mask">
        <div class="canvas__ring"></div>
        <div class="canvas__track">
          <div class="canvas__fill" :style="{ width: ws.tryProgress + '%' }"></div>
        </div>
        <div class="canvas__stage">{{ tryStageText }} · {{ ws.tryProgress }}%</div>
      </div>

      <!-- 试穿结果图 -->
      <img v-else-if="ws.tryImage" :src="ws.tryImage" class="canvas__result" alt="试穿结果" />

      <!-- 已选单品拼贴 -->
      <div v-else-if="!ws.isEmpty" class="canvas__collage">
        <img
          v-for="g in ws.items"
          :key="g.id"
          :src="g.display_image_url"
          class="canvas__img"
          alt=""
        />
      </div>

      <!-- 空态 -->
      <template v-else>
        <AppIcon name="body" :size="120" class="canvas__mannequin" />
        <div class="canvas__hint">点下方单品，把它们「上身」</div>
      </template>

      <!-- 已上身 chip 条（点 chip 移除；试穿中隐藏）-->
      <div v-if="!ws.isEmpty && !ws.trying" class="canvas__bar">
        <button v-for="g in ws.items" :key="g.id" class="canvas__chip" @click="ws.remove(g.id)">
          <AppIcon name="dress" :size="13" />{{ pieceName(g) }}
          <span class="canvas__chip-x">×</span>
        </button>
      </div>
    </div>

    <!-- 试穿按钮 + 错误 -->
    <button class="tryon-btn" :disabled="ws.isEmpty || ws.trying" @click="onTryOn">
      <AppIcon name="sparkle" :size="18" />
      {{ ws.trying ? '生成中…' : '试穿这套' }}
    </button>
    <div v-if="ws.error" class="ws-error">{{ ws.error }}</div>

    <!-- 衣柜选择器 -->
    <div class="picker">
      <div class="picker__chips">
        <button
          v-for="c in categories"
          :key="c.en"
          class="chip"
          :class="{ 'chip--active': c.en === activeCat }"
          @click="activeCat = c.en"
        >
          {{ c.zh }}
        </button>
      </div>
      <div v-if="filtered.length" class="picker__grid">
        <button v-for="g in filtered" :key="g.id" class="pick" @click="ws.add(g)">
          <div class="pick__thumb"><GarmentThumb :src="g.display_image_url" :icon-size="26" /></div>
          <div class="pick__name">{{ pieceName(g) }}</div>
        </button>
      </div>
      <div v-else class="picker__empty">
        {{ wardrobe.loading ? '加载衣柜中…' : '衣柜是空的，先去上传单品' }}
      </div>
    </div>

    <!-- 保存 Sheet -->
    <div v-if="showSave" class="sheet">
      <div class="sheet__backdrop" @click="showSave = false"></div>
      <div class="sheet__panel">
        <div class="sheet__handle"></div>
        <div class="sheet__title">给这套穿搭取个名字</div>
        <input v-model="saveName" class="sheet__input" placeholder="如 简约通勤" />

        <div class="sheet__label">场合</div>
        <div class="sheet__chips">
          <button
            v-for="o in occasions"
            :key="o.value"
            class="chip chip--sm"
            :class="{ 'chip--active': o.value === occasion }"
            @click="occasion = o.value"
          >
            {{ o.label_zh }}
          </button>
        </div>

        <div v-if="autoTags.length" class="sheet__tags">
          <span v-for="t in autoTags" :key="t" class="tag">{{ enums.label('style_tag', t) }}</span>
        </div>
        <div v-if="ws.error" class="sheet__error">{{ ws.error }}</div>

        <div class="sheet__actions">
          <button class="sheet__cancel" @click="showSave = false">取消</button>
          <button class="sheet__confirm" :disabled="ws.saving" @click="onSave">
            {{ ws.saving ? '保存中…' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模特 setup Sheet（没 avatar 时试穿前弹）-->
    <div v-if="showModel" class="sheet">
      <div class="sheet__backdrop" @click="showModel = false"></div>
      <div class="sheet__panel">
        <div class="sheet__handle"></div>
        <div class="sheet__title">先生成你的模特</div>
        <div class="sheet__sub">用于把衣服「穿」到你身上，只需一次</div>

        <div class="sheet__label">性别</div>
        <div class="sheet__chips">
          <button
            v-for="o in genders"
            :key="o.value"
            class="chip chip--sm"
            :class="{ 'chip--active': o.value === gender }"
            @click="gender = o.value"
          >
            {{ o.label_zh }}
          </button>
        </div>

        <div class="sheet__label">肤色</div>
        <div class="sheet__chips">
          <button
            v-for="o in skinTones"
            :key="o.value"
            class="chip chip--sm"
            :class="{ 'chip--active': o.value === skinTone }"
            @click="skinTone = o.value"
          >
            {{ o.label_zh }}
          </button>
        </div>

        <div class="sheet__actions">
          <button class="sheet__cancel" @click="showModel = false">取消</button>
          <button class="sheet__confirm" @click="confirmModel">生成并试穿</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/icons/AppIcon.vue';
import GarmentThumb from '@/components/GarmentThumb.vue';
import type { Garment } from '@/api/types/wardrobe';
import { useAuthStore } from '@/stores/auth';
import { useWardrobeStore } from '@/stores/wardrobe';
import { useProfileStore } from '@/stores/profile';
import { useWorkshopStore } from '@/stores/workshop';
import { useEnums } from '@/composables/useEnums';
import { useNotifyStore } from '@/stores/notify';
import PageHeader from '@/components/PageHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const wardrobe = useWardrobeStore();
const profileStore = useProfileStore();
const ws = useWorkshopStore();
const enums = useEnums();
const notify = useNotifyStore();

onMounted(() => {
  void enums.ensureLoaded();
  void wardrobe.getClothes(); // 选择器要真衣物
  if (auth.loggedIn) void profileStore.fetchProfile(); // 预填模特参数（body_type/height）
  ws.clear(); // 每次进工坊从空画布开始
});

onBeforeUnmount(() => {
  ws.clear(); // 不管从哪条路离开，都保证下次进来是干净的
});

async function goBack() {
  // 有未保存的搭配 / 效果图 → 先确认（效果图生成花了几分钟，别误触丢掉）
  if (!ws.isEmpty || ws.tryImage) {
    // 重构到 useTryOn 后这里改成 tryon.image
    const ok = await notify.confirm({
      title: '退出会丢失当前搭配',
      message: '效果图和已选单品都不会保留',
      okText: '退出',
      cancelText: '继续搭配',
      danger: true,
    });
    if (!ok) return;
  }
  router.back();
}

const pieceName = (g: Garment) => `${g.primary_color ?? ''}${g.category}`;

// —— 分类：从真实衣物派生（en 过滤，zh 显示）——
const categories = computed(() => {
  const seen = new Map<string, string>();
  for (const g of wardrobe.items) seen.set(g.category_en, g.category);
  return [{ en: 'ALL', zh: '全部' }, ...[...seen].map(([en, zh]) => ({ en, zh }))];
});
const activeCat = ref('ALL');
const filtered = computed(() =>
  activeCat.value === 'ALL'
    ? wardrobe.items
    : wardrobe.items.filter((g) => g.category_en === activeCat.value),
);

// —— 保存 sheet ——
const showSave = ref(false);
const saveName = ref('');
const occasions = computed(() => enums.get('occasion'));
const occasion = ref('casual');
const autoTags = computed(() => [...new Set(ws.items.flatMap((g) => g.style_tags ?? []))]);

function openSave() {
  ws.error = null;
  showSave.value = true;
}

async function onSave() {
  if (!auth.loggedIn) {
    auth.openAuth();
    return;
  }
  const ok = await ws.save({
    name: saveName.value,
    occasion_en: occasion.value,
    tags_en: autoTags.value,
  });
  if (ok) {
    showSave.value = false;
    saveName.value = '';
    ws.clear();
    notify.success('已保存到收藏'); // 顺带给反馈（替代静默）
  }
}

// —— 试穿 ——
const showModel = ref(false);
const genders = computed(() => enums.get('gender'));
const skinTones = computed(() => enums.get('skin_tone'));
const gender = ref('female');
const skinTone = ref('medium');

const tryStageText = computed(() =>
  ws.tryStage === 'model' ? '生成模特中' : ws.tryStage === 'tryon' ? 'AI 换装中' : '',
);

function onTryOn() {
  if (!auth.loggedIn) {
    auth.openAuth();
    return;
  }
  if (ws.isEmpty) return;
  if (auth.user?.avatar_url) {
    void ws.tryOn(); // 已有模特，直接试穿
  } else {
    showModel.value = true; // 没模特 → 先设参数
  }
}

async function confirmModel() {
  showModel.value = false;
  await ws.tryOn({
    gender: gender.value,
    body_type: profileStore.profile.bodyType ?? 'standard', // 缺就默认
    skin_tone: skinTone.value,
    ...(profileStore.profile.height && {
      height_cm: profileStore.profile.height,
    }),
  });
}
</script>

<style scoped lang="scss">
.workshop {
  gap: 14px;
}

// ===== 顶栏 =====
// .ws-top {
//   display: flex;
//   align-items: center;
//   justify-content: space-between;
// }
// .ws-top__btn {
//   width: 38px;
//   height: 38px;
//   border: none;
//   border-radius: 50%;
//   background: var(--bg-card);
//   color: var(--text-dark);
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   box-shadow: var(--shadow-card);
//   cursor: pointer;
//   &:active {
//     transform: scale(0.92);
//   }
// }
// .ws-top__title {
//   font-size: 17px;
//   font-weight: 800;
//   color: var(--text-dark);
// }
// .ws-top__save {
//   border: none;
//   background: none;
//   color: var(--primary);
//   font-size: 15px;
//   font-weight: 700;
//   cursor: pointer;
//   &:disabled {
//     color: var(--text-light);
//     cursor: default;
//   }
// }
.ws-save {
  border: none;
  background: none;
  color: var(--primary);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    color: var(--text-light);
    cursor: default;
  }
}

// ===== 风格胶囊 =====
.ws-context {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}

// ===== 试衣画布 =====
.canvas {
  position: relative;
  height: 320px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, #efe9fb, #e6e9fb);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.canvas__mannequin {
  color: var(--primary);
  opacity: 0.5;
}
.canvas__hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-gray);
}
.canvas__collage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 24px 16px 64px;
}
.canvas__img {
  max-height: 100%;
  max-width: 30%;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(80, 90, 140, 0.25));
}
.canvas__result {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.canvas__bar {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.canvas__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  cursor: pointer;
}
.canvas__chip-x {
  color: var(--text-light);
  font-weight: 700;
}
// AI 换装遮罩
.canvas__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 40px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.canvas__ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--primary-soft);
  border-top-color: var(--primary);
  animation: vc-spin 0.8s linear infinite;
}
.canvas__track {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--bg-fill);
  overflow: hidden;
}
.canvas__fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-pill);
  transition: width 0.15s ease;
}
.canvas__stage {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gray);
}

// ===== 试穿按钮 + 错误 =====
.tryon-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  box-shadow: var(--shadow-cta);
  cursor: pointer;
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    background: #e4e4e8;
    color: var(--text-light);
    box-shadow: none;
    cursor: default;
  }
}
.ws-error {
  font-size: 13px;
  color: var(--negative, #c10015);
  text-align: center;
}

// ===== 衣柜选择器 =====
.picker__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.chip {
  flex-shrink: 0;
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-card);
  color: var(--text-gray);
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow-card);
  cursor: pointer;
}
.chip--sm {
  padding: 6px 12px;
  font-size: 12px;
  box-shadow: none;
  background: var(--bg-fill);
}
.chip--active {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
.picker__grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.picker__empty {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-light);
}
.pick {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  &:active {
    transform: scale(0.95);
  }
}
.pick__thumb {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.pick__name {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-gray);
  text-align: center;
}

// ===== 复用胶囊（自动标签）=====
.tag {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}

// ===== iOS 底部 Sheet =====
.sheet {
  position: fixed;
  inset: 0;
  z-index: 800;
  display: flex;
  align-items: flex-end;
}
.sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  animation: vc-fade 0.25s ease;
}
.sheet__panel {
  position: relative;
  width: 100%;
  padding: 10px 20px calc(20px + var(--safe-bottom));
  border-radius: 30px 30px 0 0;
  background: var(--bg-main);
  animation: vc-up 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.sheet__handle {
  width: 40px;
  height: 5px;
  margin: 0 auto 16px;
  border-radius: var(--radius-pill);
  background: var(--hairline);
}
.sheet__title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-dark);
}
.sheet__sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-gray);
}
.sheet__input {
  width: 100%;
  height: 48px;
  margin-top: 14px;
  padding: 0 14px;
  border: none;
  outline: none;
  border-radius: var(--radius-sm);
  background: var(--bg-fill);
  font-size: 15px;
  color: var(--text-dark);
  &::placeholder {
    color: var(--text-light);
  }
}
.sheet__label {
  margin-top: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gray);
}
.sheet__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.sheet__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.sheet__error {
  margin-top: 12px;
  font-size: 13px;
  color: var(--negative, #c10015);
}
.sheet__actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.sheet__cancel,
.sheet__confirm {
  flex: 1;
  height: 50px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.sheet__cancel {
  background: var(--bg-fill);
  color: var(--text-gray);
}
.sheet__confirm {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

@keyframes vc-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes vc-up {
  from {
    transform: translateY(14px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes vc-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

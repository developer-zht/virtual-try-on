<template>
  <div class="preference">
    <PageHeader title="偏好" />

    <section v-if="auth.loggedIn" class="bento" aria-label="长期偏好摘要">
      <button
        class="color-card"
        :class="{ 'color-card--empty': colorSummary.length === 0 }"
        :style="{ background: colorGradient }"
        type="button"
        @click="goPreferenceSettings('colors')"
      >
        <span class="color-card__top">
          <span class="color-card__icon">
            <AppIcon name="palette-line" :size="20" />
          </span>
          <span class="color-card__count">{{ colorSummary.length }} 色</span>
        </span>

        <span class="color-card__content">
          <strong>喜欢颜色</strong>
          <span v-if="colorSummary.length > 0" class="color-card__names">
            <span v-for="color in colorSummary" :key="color.label" class="color-card__name">
              <!-- {{ colorSummary.map((color) => color.label).join(' · ') }} -->
              {{ color.label }}
            </span>
          </span>
          <span v-else class="color-card__empty">尚未设置喜欢的颜色</span>

          <span v-if="colorSummary.length > 0" class="color-card__dots">
            <span
              v-for="color in colorSummary"
              :key="color.value"
              class="color-card__dot"
              :style="{ background: color.hex }"
            ></span>
          </span>
        </span>
      </button>

      <button
        class="summary-card summary-card--style"
        type="button"
        @click="goPreferenceSettings('styles')"
      >
        <span class="summary-card__top">
          <span class="summary-card__icon">
            <AppIcon name="tag" :size="18" />
          </span>
          <strong>喜欢风格</strong>
          <AppIcon name="chevron-left" :size="16" class="summary-card__chevron" />
        </span>

        <span v-if="styleSummary.length > 0" class="summary-card__tags">
          <span v-for="style in styleSummary" :key="style.value" class="summary-tag">
            {{ style.label }}
          </span>
        </span>
        <span v-else class="summary-card__empty">尚未设置</span>
      </button>

      <button
        class="summary-card summary-card--occasion"
        type="button"
        @click="goPreferenceSettings('occasions')"
      >
        <span class="summary-card__top">
          <span class="summary-card__icon summary-card__icon--occasion">
            <AppIcon name="layers" :size="20" />
          </span>
          <strong>常用场合</strong>
          <AppIcon name="chevron-left" :size="16" class="summary-card__chevron" />
        </span>

        <span v-if="occasionSummary.length > 0" class="summary-card__tags">
          <span
            v-for="occasion in occasionSummary"
            :key="occasion.value"
            class="summary-tag summary-tag--occasion"
          >
            {{ occasion.label }}
          </span>
        </span>
        <span v-else class="summary-card__empty">收藏后自动统计</span>
      </button>
    </section>

    <section class="section-head">
      <h2 class="section-title">我的收藏</h2>
      <span class="section-count">{{ savedCount }} 套</span>
    </section>

    <div v-if="isEmpty" class="saved-empty">
      <AppIcon name="heart" :size="40" class="saved-empty__icon" />
      <div class="saved-empty__text">{{ emptyText }}</div>
      <button class="saved-empty__btn" @click="onEmptyCta">{{ emptyBtnText }}</button>
    </div>

    <div v-else class="saved">
      <div v-for="outfit in cards" :key="outfit.id" class="saved-card">
        <div class="saved-card__head">
          <div class="saved-card__icon" :class="`saved-card__icon--${outfit.source}`">
            <AppIcon :name="outfit.source === 'ai' ? 'bulb' : 'scissors'" :size="18" />
          </div>
          <div class="saved-card__title">
            <div class="saved-card__name">{{ outfit.name }}</div>
            <div class="saved-card__meta">{{ outfit.meta }}</div>
          </div>
          <button
            class="saved-card__apply"
            aria-label="应用这套（暂未开放）"
            disabled
            title="设为今日穿搭需后端放开（当前仅支持 generated）"
          >
            <AppIcon name="sparkle" :size="18" />
          </button>
          <button class="saved-card__del" aria-label="删除" @click="onDelete(outfit.id)">
            <AppIcon name="trash" :size="18" />
          </button>
        </div>
        <div class="saved-card__pieces">
          <span v-for="(piece, index) in outfit.pieces" :key="index" class="mini-tag">
            <AppIcon name="dress" :size="13" />{{ piece }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import type { Outfit } from '@/api/types/outfits';
import PageHeader from '@/components/PageHeader.vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import { ROUTES } from '@/constants/routes';
import { useEnums } from '@/composables/useEnums';
import { useAuthStore } from '@/stores/auth';
import { useNotifyStore } from '@/stores/notify';
import { useProfileStore } from '@/stores/profile';
import { useSavedOutfitsStore } from '@/stores/savedOutfits';

type PreferenceSection = 'colors' | 'styles' | 'occasions';

interface SummaryTag {
  value: string;
  label: string;
}

interface ColorSummary extends SummaryTag {
  hex: string;
}

interface SavedCard {
  id: string;
  name: string;
  meta: string;
  source: 'ai' | 'manual';
  pieces: string[];
}

const router = useRouter();
const notify = useNotifyStore();
const auth = useAuthStore();
const enums = useEnums();
const profileStore = useProfileStore();
const saved = useSavedOutfitsStore();

const { isEmpty, savedCount, items } = storeToRefs(saved);
const { fetchSaved, removeSaved } = saved;

const COLOR_HEX: Record<string, string> = {
  black: '#30323a',
  white: '#ffffff',
  gray: '#a8abb2',
  grey: '#a8abb2',
  red: '#cf4f58',
  blue: '#7f98b8',
  'denim blue': '#7f98b8',
  navy: '#344766',
  green: '#66836b',
  yellow: '#e0bd5e',
  beige: '#d9c7a5',
  brown: '#8d6d59',
  purple: '#8a78a8',
  pink: '#d89bab',
  orange: '#d68a55',
};

function colorHex(value: string): string {
  return COLOR_HEX[value.trim().toLowerCase()] ?? '#7c83aa';
}

function sourceOf(outfit: Outfit): 'ai' | 'manual' {
  return outfit.source_en === 'tag7_workshop' ? 'manual' : 'ai';
}

const colorSummary = computed<ColorSummary[]>(() =>
  profileStore.profile.colors.map((value) => ({
    value,
    label: enums.label('color', value),
    hex: colorHex(value),
  })),
);
// const colorSummary = ref([
//   {
//     value: 'black',
//     label: '黑',
//     hex: '#30323a',
//   },
//   {
//     value: 'white',
//     label: '白',
//     hex: '#ffffff',
//   },
//   {
//     value: 'yellow',
//     label: '黄',
//     hex: '#e0bd5e',
//   },
//   {
//     value: 'orange',
//     label: '橙',
//     hex: '#d68a55',
//   },
// ]);

function softenHex(hex: string, whiteRatio = 0.26): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  const mix = (channel: number) => Math.round(channel + (255 - channel) * whiteRatio);

  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

const colorGradient = computed(() => {
  const colors = colorSummary.value.map((color) => softenHex(color.hex, 0.26));
  if (colors.length === 0) return '#ffffff';
  if (colors.length === 1) return colors[0]!;

  const stops = colors.map((color, index) => {
    const position = Math.round((index / (colors.length - 1)) * 100);
    return `${color} ${position}%`;
  });
  console.log(stops);

  return `linear-gradient(180deg, ${stops.join(', ')})`;
});

// const colorGradient = computed(() => {
//   const colors = colorSummary.value.map((color) => softenHex(color.hex, 0.26));

//   if (colors.length === 0) return '#ffffff';
//   if (colors.length === 1) return colors[0]!;

//   const transitionWidth = 10;
//   const halfTransition = transitionWidth / 2;
//   const stops: string[] = [`${colors[0]} 0%`];

//   for (let index = 0; index < colors.length - 1; index += 1) {
//     const boundary = ((index + 1) / colors.length) * 100;

//     stops.push(
//       `${colors[index]} ${boundary - halfTransition}%`,
//       `${colors[index + 1]} ${boundary + halfTransition}%`,
//     );
//   }

//   stops.push(`${colors[colors.length - 1]} 100%`);

//   return `linear-gradient(180deg, ${stops.join(', ')})`;
// });

const styleSummary = computed<SummaryTag[]>(() =>
  profileStore.profile.styles
    .map((value) => ({
      value,
      label: enums.label('style_tag', value),
    }))
    .slice(0, 3),
);

const occasionSummary = computed<SummaryTag[]>(() => {
  const frequency = new Map<string, { label: string; count: number }>();

  items.value.forEach((outfit) => {
    const value = outfit.occasion_en || outfit.occasion || 'other';
    const current = frequency.get(value);
    frequency.set(value, {
      label: outfit.occasion || outfit.occasion_en || '其他',
      count: (current?.count ?? 0) + 1,
    });
  });

  return [...frequency.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 3)
    .map(([value, item]) => ({ value, label: item.label }));
});

const cards = computed<SavedCard[]>(() =>
  items.value.map((outfit) => {
    const source = sourceOf(outfit);
    return {
      id: outfit.id,
      name: outfit.name ?? outfit.occasion ?? '未命名穿搭',
      source,
      meta: `${source === 'ai' ? 'AI 推荐' : '手动搭配'} · ${outfit.garments.length} 件`,
      pieces: outfit.garments.map((garment) => `${garment.primary_color ?? ''}${garment.category}`),
    };
  }),
);

const emptyText = computed(() =>
  auth.loggedIn ? '还未有任何收藏，去首页生成一套吧' : '登录后查看你的收藏',
);
const emptyBtnText = computed(() => (auth.loggedIn ? '去首页' : '去登录'));

async function loadPreferenceSummary(): Promise<void> {
  await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()]);
}

onMounted(() => {
  void fetchSaved();
  if (auth.loggedIn) void loadPreferenceSummary();
});

function goPreferenceSettings(section: PreferenceSection): void {
  void router.push({
    name: ROUTES.preferenceSettings,
    query: { section },
  });
}

function onEmptyCta(): void {
  if (auth.loggedIn) void router.push({ name: ROUTES.home });
  else auth.openAuth('register');
}

async function onDelete(id: string): Promise<void> {
  const confirmed = await notify.confirm({
    title: '删除收藏',
    message: '确定要从个人偏好中删除这套收藏吗？此操作不可撤销。',
    okText: '删除',
    danger: true,
  });
  if (!confirmed) return;
  if (await removeSaved(id)) notify.success('已删除');
}
</script>

<style scoped lang="scss">
.preference {
  gap: 16px;
}

.bento {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  grid-template-rows: repeat(2, minmax(112px, auto));
  gap: 12px;
}

.color-card,
.summary-card {
  width: 100%;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.color-card {
  position: relative;
  grid-row: span 2;
  min-height: 236px;
  overflow: hidden;
  padding: 18px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  box-shadow: var(--shadow-hero);
}

.color-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    // radial-gradient(circle at 82% 10%, rgba(255, 255, 255, 0.4), transparent 30%),
    linear-gradient(180deg, rgba(20, 22, 30, 0.06), rgba(20, 22, 30, 0.18));

  pointer-events: none;
}

.color-card::after {
  content: '';
  position: absolute;
  right: -28px;
  bottom: -42px;
  width: 130px;
  height: 130px;
  border: 13px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  pointer-events: none;
}

.color-card--empty {
  border: 1px solid var(--hairline);
  color: var(--text-dark);
  box-shadow: var(--shadow-card);
}

.color-card--empty::before {
  background: linear-gradient(180deg, transparent, rgba(74, 79, 176, 0.04));
}

.color-card--empty::after {
  border-color: rgba(74, 79, 176, 0.08);
}

.color-card__top,
.color-card__content {
  position: relative;
  z-index: 1;
}

.color-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.color-card__icon {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
}

.color-card--empty .color-card__icon {
  border-color: var(--button-secondary-border);
  color: var(--primary);
  background: var(--primary-soft);
}

.color-card__count {
  padding: 5px 9px;
  border-radius: var(--radius-pill);
  background: rgba(24, 26, 34, 0.22);
  font-size: 11px;
  font-weight: 750;
}

.color-card--empty .color-card__count {
  color: var(--text-gray);
  background: var(--bg-fill);
}

.color-card__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.color-card__content strong {
  font-size: 21px;
}

.color-card__names,
.color-card__empty {
  width: 100%;
  width: fit-content;
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.88;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: 7px;
}

.color-card__name {
  display: grid;
  justify-content: center;
  align-items: center;
  width: 22px;
  height: 22px;
}

.color-card__empty {
  color: var(--text-gray);
}

.color-card__dots {
  display: flex;
  gap: 7px;
  margin-top: 6px;
}

.color-card__dot {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(25, 27, 35, 0.1),
    0 5px 12px rgba(25, 27, 35, 0.15);
}

.summary-card {
  min-height: 112px;
  padding: 14px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  color: var(--text-dark);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.summary-card--style {
  background: linear-gradient(145deg, rgba(98, 106, 165, 0.07), rgba(255, 255, 255, 0.97) 72%);
}

.summary-card--occasion {
  background: linear-gradient(145deg, rgba(0, 178, 148, 0.07), rgba(255, 255, 255, 0.97) 72%);
}

.summary-card:active,
.color-card:active {
  transform: scale(0.98);
}

.summary-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// .summary-card__top > strong {
//   font-size: 13px;
// }

.summary-card__icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: var(--primary-soft);
}

.summary-card__icon--occasion {
  color: #008f78;
  background: rgba(0, 178, 148, 0.12);
}

.summary-card__chevron {
  color: var(--text-light);
  transform: rotate(180deg);
}

// .summary-card > strong {
//   margin-top: 8px;
//   font-size: 13px;
// }

.summary-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  // max-height: 46px;
  margin-top: 8px;
  overflow: hidden;
}

.summary-tag {
  max-width: 100%;
  padding: 4px 7px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  color: var(--primary);
  background: var(--primary-soft);
  font-size: 10px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-tag--occasion {
  color: #008f78;
  background: rgba(0, 178, 148, 0.1);
}

.summary-card__empty {
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-light);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-dark);
}

.section-count {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  color: var(--primary);
  background: var(--primary-soft);
  font-size: 12px;
  font-weight: 750;
}

.saved-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 24px;
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--text-light);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.saved-empty__text {
  margin-top: 12px;
  color: var(--text-gray);
  font-size: 14px;
}

.saved-empty__btn {
  margin-top: 16px;
  padding: 9px 20px;
  border: 1px solid var(--button-secondary-border);
  border-radius: var(--radius-pill);
  color: var(--primary);
  background: var(--gradient-button-secondary);
  font-size: 14px;
  font-weight: 600;
}

.saved {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saved-card {
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.saved-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.saved-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.saved-card__icon--ai {
  color: var(--primary);
  background: var(--primary-soft);
}

.saved-card__icon--manual {
  color: #00b294;
  background: rgba(0, 178, 148, 0.12);
}

.saved-card__title {
  min-width: 0;
  flex: 1;
}

.saved-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark);
}

.saved-card__meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-gray);
}

.saved-card__apply,
.saved-card__del {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.saved-card__apply {
  color: var(--primary);
  background: var(--primary-soft);
}

.saved-card__apply:disabled {
  opacity: 0.4;
}

.saved-card__del {
  color: var(--danger);
  background: var(--bg-fill);
}

.saved-card__pieces {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.mini-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  color: var(--text-gray);
  background: var(--bg-fill);
  font-size: 11px;
  font-weight: 500;
}
</style>

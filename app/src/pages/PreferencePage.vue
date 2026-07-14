<template>
  <div class="preference">
    <PageHeader title="个人偏好" />

    <!-- 统计区 Bento（全接 store getter）-->
    <div class="bento">
      <div class="stat-big">
        <div class="stat-big__label">保存穿搭</div>
        <div class="stat-big__num">{{ savedCount }}</div>
        <div class="stat-big__unit">套已收藏</div>
        <AppIcon name="heart" :size="130" class="stat-big__watermark" />
      </div>
      <div class="stat-small stat-small--purple">
        <div class="stat-small__icon"><AppIcon name="tag" :size="20" /></div>
        <div class="stat-small__num">{{ tagCount }}</div>
        <div class="stat-small__label">偏好标签</div>
      </div>
      <div class="stat-small stat-small--green">
        <div class="stat-small__icon"><AppIcon name="layers" :size="20" /></div>
        <div class="stat-small__num">{{ occasionCount }}</div>
        <div class="stat-small__label">场合类型</div>
      </div>
    </div>

    <h2 class="section-title">我的收藏</h2>

    <!-- 空态：未登录 or 无收藏 -->
    <div v-if="isEmpty" class="saved-empty">
      <AppIcon name="heart" :size="40" class="saved-empty__icon" />
      <div class="saved-empty__text">{{ emptyText }}</div>
      <button class="saved-empty__btn" @click="onEmptyCta">{{ emptyBtnText }}</button>
    </div>

    <div v-else class="saved">
      <div v-for="o in cards" :key="o.id" class="saved-card">
        <div class="saved-card__head">
          <div class="saved-card__icon" :class="`saved-card__icon--${o.source}`">
            <AppIcon :name="o.source === 'ai' ? 'sparkle' : 'scissors'" :size="18" />
          </div>
          <div class="saved-card__title">
            <div class="saved-card__name">{{ o.name }}</div>
            <div class="saved-card__meta">{{ o.meta }}</div>
          </div>
          <button
            class="saved-card__apply"
            aria-label="应用这套（暂未开放）"
            disabled
            title="设为今日穿搭需后端放开（当前仅支持 generated）"
          >
            <AppIcon name="bookmark" :size="18" />
          </button>
          <button class="saved-card__del" aria-label="删除" @click="onDelete(o.id)">
            <AppIcon name="trash" :size="18" />
          </button>
        </div>
        <div class="saved-card__pieces">
          <span v-for="(p, i) in o.pieces" :key="i" class="mini-tag">
            <AppIcon name="dress" :size="13" />{{ p }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import PageHeader from '@/components/PageHeader.vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import { ROUTES } from '@/constants/routes';
import type { Outfit } from '@/api/types/outfits';
import { useAuthStore } from '@/stores/auth';
import { useSavedOutfitsStore } from '@/stores/savedOutfits';

const router = useRouter();
const auth = useAuthStore();

const saved = useSavedOutfitsStore();
const { isEmpty, savedCount, occasionCount, tagCount, items } = storeToRefs(saved);
const { fetchSaved, remove } = saved;

onMounted(() => {
  void fetchSaved(); // 未登录时 store 内部早退 → items 空 → isEmpty → 显空态
});

// ── Step 4：Outfit → 卡片 display（边缘映射，只读渲染用 computed）──
interface SavedCard {
  id: string;
  name: string;
  meta: string;
  source: 'ai' | 'manual';
  pieces: string[];
}
function sourceOf(o: Outfit): 'ai' | 'manual' {
  return o.source_en === 'tag7_workshop' ? 'manual' : 'ai';
}
const cards = computed<SavedCard[]>(() =>
  items.value.map((o) => {
    const source = sourceOf(o);
    return {
      id: o.id,
      name: o.name ?? o.occasion ?? '未命名穿搭',
      source,
      meta: `${source === 'ai' ? 'AI 推荐' : '手动搭配'} · ${o.garments.length} 件`,
      pieces: o.garments.map((g) => `${g.primary_color ?? ''}${g.category}`),
    };
  }),
);

// ── 空态 CTA：未登录 → 引导登录；已登录 → 去首页 ──
const emptyText = computed(() =>
  auth.loggedIn ? '还未有任何收藏，去首页生成一套吧' : '登录后查看你的收藏',
);
const emptyBtnText = computed(() => (auth.loggedIn ? '去首页' : '去登录'));
function onEmptyCta() {
  if (auth.loggedIn) void router.push({ name: ROUTES.home });
  else auth.openAuth('register');
}

function onDelete(id: string) {
  void remove(id);
}
</script>
<style scoped lang="scss">
.preference {
  gap: 16px;
}

// 收藏空态
.saved-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 24px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  color: var(--text-light);
}
.saved-empty__text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-gray);
}
.saved-empty__btn {
  margin-top: 16px;
  padding: 9px 20px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:active {
    transform: scale(0.95);
  }
}

// ===== 统计 Bento =====
.bento {
  display: grid;
  grid-template-columns: 1.35fr 1fr; // 左宽右窄
  grid-template-rows: auto auto;
  gap: 12px;
}
.stat-big {
  grid-row: span 2; // ★跨两行：占满左列
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, #6c5ce7, #8b7bf0);
  color: #fff;
  box-shadow: var(--shadow-hero);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.stat-big__label,
.stat-big__unit {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.85;
}
.stat-big__num {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1;
  margin: 4px 0;
}
.stat-big__watermark {
  position: absolute;
  right: -24px;
  bottom: -24px;
  color: #fff;
  opacity: 0.15; // 超大半透明水印
}
.stat-small {
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}
.stat-small__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.stat-small--purple .stat-small__icon {
  background: var(--primary-soft);
  color: var(--primary);
}
.stat-small--green .stat-small__icon {
  background: rgba(0, 178, 148, 0.12); // 绿色强调（设计稿场合卡）
  color: #00b294;
}
.stat-small__num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-dark);
}
.stat-small__label {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-gray);
}

// ===== 收藏列表 =====
.section-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-dark);
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
  display: flex;
  align-items: center;
  justify-content: center;
}
.saved-card__icon--ai {
  background: var(--primary-soft);
  color: var(--primary);
}
.saved-card__icon--manual {
  background: rgba(0, 178, 148, 0.12);
  color: #00b294;
}
.saved-card__title {
  flex: 1; // 吃掉中间空间，把应用按钮推到最右
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
.saved-card__apply {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active {
    transform: scale(0.9);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  } /* 应用按钮暂占位 */
}
.saved-card__pieces {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.saved-card__del {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--bg-fill);
  color: var(--text-light);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active {
    transform: scale(0.9);
    color: var(--negative, #c10015);
  }
}
.mini-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-fill);
  color: var(--text-gray);
  font-size: 11px;
  font-weight: 500;
}
</style>

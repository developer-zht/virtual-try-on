<template>
  <div class="preference-settings">
    <PageHeader title="偏好设定" back @back="requestBack">
      <template #action>
        <button
          class="save-button"
          type="button"
          :disabled="headerActionDisabled"
          @click="onHeaderAction"
        >
          {{ headerActionText }}
        </button>
      </template>
    </PageHeader>

    <div class="route-path">我的 › 偏好设定</div>

    <section class="intro">
      <h2>风格与颜色偏好</h2>
      <p>这些是长期推荐偏好。修改后会影响后续推荐，不会改变已经收藏的穿搭。</p>
    </section>

    <section v-if="pageLoadState === 'loading'" class="load-state" role="status" aria-live="polite">
      <h2>正在读取最新偏好…</h2>
      <p>正在同步你的 Profile 和可选标签。</p>
    </section>

    <section v-else-if="pageLoadState === 'failed'" class="load-state load-state--failed">
      <h2>偏好读取失败</h2>
      <p>在成功重新加载前不会显示或修改偏好草稿，请点击右上角“重新加载”。</p>
    </section>

    <template v-if="pageLoadState === 'ready'">
      <section id="settings-styles" class="settings-section">
        <div class="settings-section__head">
          <span class="settings-section__copy">
            <strong>喜欢风格</strong>
            <small>最多选择 3 个</small>
          </span>
          <span class="settings-section__count">{{ styleDraft.length }} / 3</span>
        </div>

        <div class="option-list" aria-label="喜欢风格选项">
          <button
            v-for="option in styleOptions"
            :key="option.value"
            class="option-chip"
            :class="{ 'option-chip--selected': styleDraft.includes(option.value) }"
            type="button"
            :disabled="saving"
            :aria-pressed="styleDraft.includes(option.value)"
            @click="toggleSelection(styleDraft, option.value, 3, '风格')"
          >
            {{ option.label_zh }}
          </button>
        </div>
      </section>

      <section id="settings-colors" class="settings-section">
        <div class="settings-section__head">
          <span class="settings-section__copy">
            <strong>喜欢颜色</strong>
            <small>最多选择 5 个，也可以全部取消</small>
          </span>
          <span class="settings-section__count">{{ colorDraft.length }} / 5</span>
        </div>

        <div class="option-list" aria-label="喜欢颜色选项">
          <button
            v-for="option in colorOptions"
            :key="option.value"
            class="option-chip option-chip--color"
            :class="{ 'option-chip--selected': colorDraft.includes(option.value) }"
            type="button"
            :disabled="saving"
            :aria-pressed="colorDraft.includes(option.value)"
            @click="toggleSelection(colorDraft, option.value, 5, '颜色')"
          >
            <span
              class="color-swatch"
              :style="{ background: colorHex(option.value) }"
              aria-hidden="true"
            ></span>
            {{ option.label_zh }}
          </button>
        </div>
      </section>

      <section
        id="settings-occasions"
        class="settings-section settings-section--readonly"
        aria-labelledby="occasions-title"
      >
        <div class="settings-section__head">
          <span class="settings-section__copy">
            <strong id="occasions-title">常用场合</strong>
            <small>根据收藏自动统计</small>
          </span>
          <span class="readonly-badge">只读</span>
        </div>

        <div v-if="allOccasions.length > 0" class="occasion-list">
          <span v-for="occasion in allOccasions" :key="occasion.value" class="occasion-chip">
            {{ occasion.label }}
            <small>{{ occasion.count }} 套</small>
          </span>
        </div>
        <p v-else class="occasion-empty">收藏穿搭后，这里会自动汇总你的常用场合。</p>

        <p class="readonly-note">
          当前 Profile 接口没有可编辑的常用场合字段，所以这里用于查看收藏统计，不提供选择操作。
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import { useEnums } from '@/composables/useEnums';
import { useAuthStore } from '@/stores/auth';
import { useDecisionDialogStore } from '@/stores/decisionDialog';
import { useNotifyStore } from '@/stores/notify';
import { useProfileStore } from '@/stores/profile';
import { useSavedOutfitsStore } from '@/stores/savedOutfits';
import type { ProfileState } from '../../stores/types/profile';
import {
  createPreferenceCandidate,
  createPreferenceDraft,
  isPreferenceDraftDirty,
  type PreferenceDraft,
} from './preferenceSettings';

type PreferenceSection = 'styles' | 'colors' | 'occasions';
type LeaveChoice = 'stay' | 'discard' | 'save';
type PageLoadState = 'loading' | 'failed' | 'ready';

interface OccasionSummary {
  value: string;
  label: string;
  count: number;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const decisionDialog = useDecisionDialogStore();
const notify = useNotifyStore();
const enums = useEnums();
const profileStore = useProfileStore();
const savedOutfits = useSavedOutfitsStore();

const styleDraft = ref<string[]>([]);
const colorDraft = ref<string[]>([]);
const initialSnapshot = ref<PreferenceDraft>({ styles: [], colors: [] });
const pageLoadState = ref<PageLoadState>('loading');
const saving = ref(false);

const styleOptions = computed(() => enums.get('style_tag'));
const colorOptions = computed(() => enums.get('color'));
const isDirty = computed(() => isPreferenceDraftDirty(currentDraft(), initialSnapshot.value));
const canSave = computed(() => pageLoadState.value === 'ready' && isDirty.value && !saving.value);
const headerActionText = computed(() => {
  if (pageLoadState.value === 'loading') return '加载中';
  if (pageLoadState.value === 'failed') return '重新加载';
  return saving.value ? '保存中' : '保存';
});
const headerActionDisabled = computed(() => {
  if (pageLoadState.value === 'loading') return true;
  if (pageLoadState.value === 'failed') return false;
  return !canSave.value;
});

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

const allOccasions = computed<OccasionSummary[]>(() => {
  const frequency = new Map<string, OccasionSummary>();

  savedOutfits.items.forEach((outfit) => {
    const value = outfit.occasion_en || outfit.occasion || 'other';
    const current = frequency.get(value);
    frequency.set(value, {
      value,
      label: outfit.occasion || outfit.occasion_en || '其他',
      count: (current?.count ?? 0) + 1,
    });
  });

  return [...frequency.values()].sort((left, right) => right.count - left.count);
});

function toggleSelection(draft: string[], value: string, max: number, label: string): void {
  const selectedIndex = draft.indexOf(value);
  if (selectedIndex >= 0) {
    draft.splice(selectedIndex, 1);
    return;
  }

  if (draft.length >= max) {
    notify.info(`${label}最多选择 ${max} 个`);
    return;
  }

  draft.push(value);
}

function isPreferenceSection(value: unknown): value is PreferenceSection {
  return value === 'styles' || value === 'colors' || value === 'occasions';
}

async function focusSection(value: unknown): Promise<void> {
  if (!isPreferenceSection(value)) return;
  await nextTick();
  const target = document.getElementById(`settings-${value}`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadUiDraft(): Promise<boolean> {
  pageLoadState.value = 'loading';

  try {
    await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()]);
  } catch {
    pageLoadState.value = 'failed';
    notify.error('偏好读取失败，请稍后重试');
    return false;
  }

  if (profileStore.error || !enums.loaded.value) {
    pageLoadState.value = 'failed';
    if (!profileStore.error) notify.error('偏好选项读取失败，请稍后重试');
    return false;
  }

  resetDraft(createPreferenceDraft(profileStore.profile));
  pageLoadState.value = 'ready';
  return true;
}

async function loadAndFocus(): Promise<void> {
  if (await loadUiDraft()) void focusSection(route.query.section);
}

async function loadOccasionSummary(): Promise<void> {
  try {
    await savedOutfits.fetchSaved();
  } catch {
    // 常用场合只是只读收藏统计；未知异常也不能阻止风格和颜色进入可编辑状态。
  }
}

onMounted(async () => {
  if (!auth.loggedIn) {
    auth.openAuth('login');
    void router.replace({ name: 'profile' });
    return;
  }

  void loadOccasionSummary();
  await loadAndFocus();
});

function currentDraft(): PreferenceDraft {
  return {
    styles: [...styleDraft.value],
    colors: [...colorDraft.value],
  };
}

function resetDraft(next: PreferenceDraft): void {
  styleDraft.value = [...next.styles];
  colorDraft.value = [...next.colors];
  initialSnapshot.value = {
    styles: [...next.styles],
    colors: [...next.colors],
  };
}

async function saveDraft(): Promise<boolean> {
  if (!canSave.value) return false;

  const nextProfile: ProfileState = createPreferenceCandidate(profileStore.profile, currentDraft());
  saving.value = true;

  try {
    const saved = await profileStore.saveProfile(nextProfile);
    if (!saved) {
      notify.error(profileStore.error ?? '偏好保存失败，请稍后重试');
      return false;
    }

    resetDraft(createPreferenceDraft(profileStore.profile));
    notify.success('偏好已保存');
    return true;
  } finally {
    saving.value = false;
  }
}

async function onHeaderAction() {
  if (pageLoadState.value === 'failed') {
    await loadAndFocus();
    return;
  }

  if (pageLoadState.value === 'ready') await saveDraft();
}

function askLeave(): Promise<LeaveChoice> {
  return decisionDialog.choose<LeaveChoice>({
    title: '有未保存的更改',
    message: '你修改了风格或颜色偏好，离开前要保存吗？',
    dismissValue: 'stay',
    actions: [
      { value: 'stay', label: '继续编辑', tone: 'quiet' },
      { value: 'discard', label: '放弃修改', tone: 'quiet' },
      {
        value: 'save',
        label: '保存并离开',
        tone: 'primary',
        disabled: !canSave.value,
      },
    ],
  });
}

async function requestBack(): Promise<void> {
  if (pageLoadState.value !== 'ready' || !isDirty.value) {
    router.back();
    return;
  }

  const choice = await askLeave();
  switch (choice) {
    case 'stay':
      return;

    case 'save':
      if (!(await saveDraft())) return;
      break;

    case 'discard':
      resetDraft(initialSnapshot.value);
      break;
  }

  router.back();
}

onBeforeRouteLeave(async () => {
  if (pageLoadState.value !== 'ready' || !isDirty.value) return true;

  const choice = await askLeave();
  switch (choice) {
    case 'stay':
      return false;

    case 'save':
      return await saveDraft();

    case 'discard':
      resetDraft(initialSnapshot.value);
      return true;
  }
});
</script>

<style scoped lang="scss">
.preference-settings {
  gap: 14px;
  padding-bottom: 36px;
  scroll-behavior: smooth;
}

.save-button {
  min-width: 38px;
  height: 38px;
  border: 0;
  color: var(--primary);
  background: transparent;
  font-size: 14px;
  font-weight: 750;
}

.route-path {
  width: fit-content;
  padding: 5px 9px;
  border-radius: var(--radius-pill);
  color: var(--primary);
  background: var(--primary-soft);
  font-size: 11px;
  font-weight: 650;
}

.intro h2 {
  font-size: 23px;
  line-height: 1.2;
  color: var(--text-dark);
}

.intro p {
  margin-top: 7px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-gray);
}

.load-state {
  min-height: 160px;
  padding: 28px 20px;
  border: 1px solid rgba(74, 79, 176, 0.07);
  border-radius: var(--radius-lg);
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.load-state h2 {
  font-size: 17px;
  color: var(--text-dark);
}

.load-state p {
  max-width: 290px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-gray);
}

.load-state--failed {
  border-color: rgba(240, 68, 56, 0.13);
  background: linear-gradient(145deg, var(--bg-card), rgba(240, 68, 56, 0.04));
}

.settings-section {
  scroll-margin-top: 18px;
  padding: 17px;
  border: 1px solid rgba(74, 79, 176, 0.07);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

.settings-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-section__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-section__copy strong {
  font-size: 16px;
  color: var(--text-dark);
}

.settings-section__copy small {
  font-size: 12px;
  color: var(--text-gray);
}

.settings-section__count,
.readonly-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 750;
}

.settings-section__count {
  color: var(--primary);
  background: var(--primary-soft);
}

.option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 16px;
}

.option-chip {
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-pill);
  color: var(--text-gray);
  background: var(--bg-fill);
  font-size: 13px;
  font-weight: 650;
}

.option-chip--selected {
  border-color: var(--button-secondary-border);
  color: var(--primary);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px rgba(74, 79, 176, 0.08);
}

.option-chip--color {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.color-swatch {
  width: 17px;
  height: 17px;
  border: 1px solid rgba(22, 24, 31, 0.12);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

.settings-section--readonly {
  border-color: rgba(0, 178, 148, 0.12);
  background: linear-gradient(145deg, var(--bg-card), rgba(0, 178, 148, 0.04));
}

.readonly-badge {
  color: #008f78;
  background: rgba(0, 178, 148, 0.11);
}

.occasion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 16px;
}

.occasion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border-radius: var(--radius-pill);
  color: #008f78;
  background: rgba(0, 178, 148, 0.1);
  font-size: 13px;
  font-weight: 650;
}

.occasion-chip small {
  font-size: 10px;
  opacity: 0.72;
}

.occasion-empty {
  margin-top: 15px;
  font-size: 13px;
  color: var(--text-gray);
}

.readonly-note {
  margin-top: 14px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  color: #53756e;
  background: rgba(0, 178, 148, 0.06);
  font-size: 12px;
  line-height: 1.55;
}
</style>

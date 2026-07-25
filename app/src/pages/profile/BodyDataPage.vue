<template>
  <div class="body-data-page">
    <PageHeader title="身体数据" back @back="requestBack">
      <template #action>
        <button class="save-btn" :disabled="headerActionDisabled" @click="onHeaderAction">
          {{ headerActionText }}
        </button>
      </template>
    </PageHeader>

    <div class="intro">
      <AppIcon name="sparkle" :size="18" />
      <p>这些数据将用于创建和更新你的专属模特。</p>
    </div>

    <template v-if="pageLoadState === 'ready'">
      <section class="form-section" aria-labelledby="required-title">
        <div class="section-heading">
          <div>
            <h2 id="required-title">必须</h2>
            <p>生成专属模特前需要完成</p>
          </div>
          <span
            class="section-state"
            :class="{
              'section-state--done': sectionState === 'ready',
              'section-state--invalid': sectionState === 'invalid',
            }"
          >
            {{ sectionStateText }}
          </span>
        </div>

        <div class="field-list">
          <div v-for="field in requiredNumbers" :key="field.key" class="number-field">
            <label class="number-field__main">
              <span>{{ field.label }}</span>
              <span class="number-field__control">
                <input
                  :value="draft[field.key] ?? ''"
                  type="number"
                  inputmode="decimal"
                  :placeholder="field.placeholder"
                  @input="setNumber(field.key, $event)"
                />
                <small>{{ field.unit }}</small>
              </span>
            </label>
            <p v-if="validationErrors[field.key]" class="field-error">
              {{ validationErrors[field.key]?.message }}
            </p>
          </div>

          <div class="choice-field">
            <div class="choice-field__label">性别</div>
            <div class="choice-grid">
              <button
                v-for="option in genderOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.gender === option.value }"
                class="choice"
                @click="draft.gender = option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.gender" class="field-error">
              {{ validationErrors.gender.message }}
            </p>
          </div>

          <div class="choice-field">
            <div class="choice-field__label">肤色</div>
            <div class="choice-grid choice-grid--wrap">
              <button
                v-for="option in skinToneOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.skinTone === option.value }"
                class="choice"
                @click="draft.skinTone = option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.skinTone" class="field-error">
              {{ validationErrors.skinTone.message }}
            </p>
          </div>

          <div class="choice-field">
            <div class="choice-field__label">体型</div>
            <div class="choice-grid choice-grid--wrap">
              <button
                v-for="option in bodyTypeOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.bodyType === option.value }"
                class="choice"
                @click="draft.bodyType = option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.bodyType" class="field-error">
              {{ validationErrors.bodyType.message }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-section" aria-labelledby="optional-title">
        <div class="section-heading">
          <div>
            <h2 id="optional-title">可选</h2>
            <p>填写后可让模特比例更贴近你</p>
          </div>
        </div>

        <div class="field-list">
          <div class="choice-field">
            <div class="choice-field__label">年龄段</div>
            <div class="choice-grid choice-grid--wrap">
              <button
                v-for="option in ageRangeOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.ageRange === option.value }"
                class="choice"
                @click="draft.ageRange = draft.ageRange === option.value ? null : option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.ageRange" class="field-error">
              {{ validationErrors.ageRange.message }}
            </p>
          </div>

          <div class="choice-field">
            <div class="choice-field__label">发型</div>
            <div class="choice-grid choice-grid--wrap">
              <button
                v-for="option in hairStyleOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.hairStyle === option.value }"
                class="choice"
                @click="draft.hairStyle = draft.hairStyle === option.value ? null : option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.hairStyle" class="field-error">
              {{ validationErrors.hairStyle.message }}
            </p>
          </div>

          <div class="choice-field">
            <div class="choice-field__label">发色</div>
            <div class="choice-grid choice-grid--wrap">
              <button
                v-for="option in hairColorOptions"
                :key="option.value"
                type="button"
                :class="{ 'choice--selected': draft.hairColor === option.value }"
                class="choice"
                @click="draft.hairColor = draft.hairColor === option.value ? null : option.value"
              >
                {{ option.label_zh }}
              </button>
            </div>
            <p v-if="validationErrors.hairColor" class="field-error">
              {{ validationErrors.hairColor.message }}
            </p>
          </div>

          <div v-for="field in optionalNumbers" :key="field.key" class="number-field">
            <label class="number-field__main">
              <span>{{ field.label }}</span>
              <span class="number-field__control">
                <input
                  :value="draft[field.key] ?? ''"
                  type="number"
                  inputmode="decimal"
                  placeholder="选填"
                  @input="setNumber(field.key, $event)"
                />
                <small>{{ field.unit }}</small>
              </span>
            </label>
            <p v-if="validationErrors[field.key]" class="field-error">
              {{ validationErrors[field.key]?.message }}
            </p>
          </div>
        </div>
      </section>

      <p class="model-note">身体数据发生变化后，现有专属模特可能需要重新生成。</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import AppIcon from '@/components/icons/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import { ROUTES } from '@/constants/routes';
import { useEnums } from '@/composables/useEnums';
import { useDecisionDialogStore } from '@/stores/decisionDialog';
import { useNotifyStore } from '@/stores/notify';
import { useProfileStore } from '@/stores/profile';
import type { ProfileState } from '../../stores/types/profile';
import {
  createBodyDataDraft,
  isBodyDataDirty,
  isRequiredBodyDataComplete,
  normalizeBodyDataDraft,
  validateBodyDataDraft,
} from '@/utils/profile/bodyData';
import type { BodyDataDraft } from '@/utils/profile/types/bodyData';
import { bodyDataEnumCatalogFromTypes, bodyDataPresentationState } from './profilePresentation';

// 页面只在本地枚举可编辑数值字段，不扩大 bodyData 类型模块的公开 API。
type OptionalNumberField =
  'shoulderWidth' | 'waist' | 'hip' | 'thigh' | 'calf' | 'legLength' | 'footLength';
type NumberKey = 'height' | 'weight' | OptionalNumberField;
type LeaveChoice = 'stay' | 'discard' | 'save';
type PageLoadState = 'loading' | 'failed' | 'ready';

const router = useRouter();
const decisionDialog = useDecisionDialogStore();
const profileStore = useProfileStore();
const notify = useNotifyStore();
const enums = useEnums();

const initialDraft = createBodyDataDraft(profileStore.profile);
const draft = reactive<BodyDataDraft>({ ...initialDraft });
const initialSnapshot = ref<BodyDataDraft>({ ...initialDraft });
const saving = ref(false);
const pageLoadState = ref<PageLoadState>('loading');
let loadAttempt = 0;
let hasPromptedLoadFailure = false;
let loadFailureDialogOpen = false;

const requiredNumbers = [
  { key: 'height', label: '身高', unit: 'cm', placeholder: '例如 165' },
  { key: 'weight', label: '体重', unit: 'kg', placeholder: '例如 52' },
] as const;
const optionalNumbers: ReadonlyArray<{ key: OptionalNumberField; label: string; unit: string }> = [
  { key: 'shoulderWidth', label: '肩宽', unit: 'cm' },
  { key: 'waist', label: '腰围', unit: 'cm' },
  { key: 'hip', label: '臀围', unit: 'cm' },
  { key: 'thigh', label: '大腿围', unit: 'cm' },
  { key: 'calf', label: '小腿围', unit: 'cm' },
  { key: 'legLength', label: '腿长', unit: 'cm' },
  { key: 'footLength', label: '脚长', unit: 'mm' },
];

const genderOptions = computed(() => enums.get('gender'));
const skinToneOptions = computed(() => enums.get('skin_tone'));
const bodyTypeOptions = computed(() => enums.get('body_shape'));
const ageRangeOptions = computed(() => enums.get('age_range'));
const hairStyleOptions = computed(() => enums.get('hair_style'));
const hairColorOptions = computed(() => enums.get('hair_color'));
const enumCatalog = computed(() => bodyDataEnumCatalogFromTypes(enums.types.value));
const requiredComplete = computed(() => isRequiredBodyDataComplete(draft));
const validationErrors = computed(() => validateBodyDataDraft(draft, enumCatalog.value));
const sectionState = computed(() => bodyDataPresentationState(draft, enumCatalog.value));
const sectionStateText = computed(() => {
  if (sectionState.value === 'ready') return '已完成';
  if (sectionState.value === 'invalid') return '待修正';
  return '待填写';
});
const isDirty = computed(() => isBodyDataDirty(draft, initialSnapshot.value));
const canSave = computed(
  () =>
    pageLoadState.value === 'ready' &&
    isDirty.value &&
    requiredComplete.value &&
    Object.keys(validationErrors.value).length === 0 &&
    !saving.value,
);
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

async function loadPageData(promptOnFailure = false): Promise<void> {
  const attempt = ++loadAttempt;
  pageLoadState.value = 'loading';
  let failureMessage: string | null = null;
  let shouldNotifyFailure = false;

  try {
    await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()]);
  } catch {
    failureMessage = '身体数据读取失败，请稍后重试';
    shouldNotifyFailure = true;
  }

  if (attempt !== loadAttempt) return;

  if (!failureMessage && profileStore.error) {
    failureMessage = profileStore.error;
  }

  if (!failureMessage && !enums.loaded.value) {
    failureMessage = '身体数据选项读取失败，请稍后重试';
    shouldNotifyFailure = true;
  }

  if (failureMessage) {
    pageLoadState.value = 'failed';
    if (shouldNotifyFailure) notify.error(failureMessage);

    if (!promptOnFailure || hasPromptedLoadFailure) return;
    hasPromptedLoadFailure = true;
    loadFailureDialogOpen = true;
    const retryNow = await notify.confirm({
      title: '身体数据读取失败',
      message: '暂时无法获取最新身体数据。在成功重新加载前不能编辑。',
      okText: '重新加载',
      cancelText: '稍后',
    });
    loadFailureDialogOpen = false;

    if (retryNow && attempt === loadAttempt) await loadPageData(false);
    return;
  }

  resetDraft(createBodyDataDraft(profileStore.profile));
  pageLoadState.value = 'ready';
}

onMounted(() => {
  void loadPageData(true);
});

function setNumber(key: NumberKey, event: Event) {
  draft[key] = (event.target as HTMLInputElement).value;
}

function resetDraft(next: BodyDataDraft) {
  Object.assign(draft, { ...next });
  initialSnapshot.value = { ...next };
}

function profileNumber(value: BodyDataDraft[NumberKey]): number | null {
  return typeof value === 'number' ? value : null;
}

// 页面只创建待保存候选值；Store 仅在 PUT 成功后接纳服务器响应。
// 原因：请求完成前，全局 Profile 必须继续表示服务器已经确认的数据。
async function saveDraft(): Promise<boolean> {
  if (!requiredComplete.value) {
    notify.info('请先完成“必须”区的五项数据');
    return false;
  }

  const firstError = Object.values(validationErrors.value)[0];
  if (firstError) {
    notify.error(firstError.message);
    return false;
  }

  const normalized = normalizeBodyDataDraft(draft);
  const nextProfile: ProfileState = {
    ...profileStore.profile,
    ...normalized,
    height: profileNumber(normalized.height),
    weight: profileNumber(normalized.weight),
    shoulderWidth: profileNumber(normalized.shoulderWidth),
    waist: profileNumber(normalized.waist),
    hip: profileNumber(normalized.hip),
    thigh: profileNumber(normalized.thigh),
    calf: profileNumber(normalized.calf),
    legLength: profileNumber(normalized.legLength),
    footLength: profileNumber(normalized.footLength),
    styles: [...profileStore.profile.styles],
    colors: [...profileStore.profile.colors],
  };
  saving.value = true;

  try {
    const saved = await profileStore.saveProfile(nextProfile);
    if (!saved) return false;

    resetDraft(createBodyDataDraft(profileStore.profile));
    notify.success('身体数据已保存');
    return true;
  } finally {
    saving.value = false;
  }
}

async function saveAndReturn() {
  if (await saveDraft()) await router.replace({ name: ROUTES.profile });
}

async function onHeaderAction(): Promise<void> {
  if (pageLoadState.value === 'failed') {
    await loadPageData(false);
    return;
  }

  if (pageLoadState.value === 'ready') await saveAndReturn();
}

function askLeave(): Promise<LeaveChoice> {
  // 页面只声明业务动作，全局 Host 统一管理 Promise、焦点、Escape 和遮罩。
  // 原因：其他编辑页可复用同一多选决策能力，不再复制 resolver 和内联 Dialog。
  return decisionDialog.choose<LeaveChoice>({
    title: '有未保存的更改',
    message: '你修改了身体数据，离开前要保存吗？',
    dismissValue: 'stay',
    actions: [
      { value: 'stay', label: '继续编辑', tone: 'quiet' },
      { value: 'discard', label: '放弃更改', tone: 'quiet' },
      {
        value: 'save',
        label: '保存并离开',
        tone: 'primary',
        disabled: !canSave.value,
      },
    ],
  });
}

async function requestBack() {
  if (pageLoadState.value !== 'ready' || !isDirty.value) {
    router.back();
    return;
  }

  const choice = await askLeave();
  if (choice === 'stay') return;
  if (choice === 'save' && !(await saveDraft())) return;
  if (choice === 'discard') resetDraft(initialSnapshot.value);
  router.back();
}

onBeforeRouteLeave(async () => {
  if (pageLoadState.value !== 'ready' || !isDirty.value) return true;
  const choice = await askLeave();
  if (choice === 'stay') return false;
  if (choice === 'save') return await saveDraft();
  resetDraft(initialSnapshot.value);
  return true;
});

onBeforeUnmount(() => {
  loadAttempt += 1;
  if (loadFailureDialogOpen) notify.settleConfirm(false);
});
</script>

<style scoped lang="scss">
.body-data-page {
  gap: 16px;
}
.save-btn {
  min-width: 44px;
  height: 36px;
  padding: 0 8px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--primary);
  font-size: 14px;
  font-weight: 800;
}
.save-btn:disabled {
  color: var(--text-light);
}
.intro {
  padding: 13px 15px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  background: var(--primary-soft);
}
.intro p {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-gray);
}
.form-section {
  padding: 20px 16px 4px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}
.section-heading {
  padding: 0 2px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.section-heading h2 {
  font-size: 19px;
  letter-spacing: -0.3px;
  color: var(--text-dark);
}
.section-heading p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-gray);
}
.section-state {
  padding: 5px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 750;
  color: #9a6b12;
  background: rgba(255, 149, 0, 0.1);
}
.section-state--invalid {
  color: #b54708;
  background: rgba(240, 68, 56, 0.1);
}
.section-state--done {
  color: #237a3b;
  background: rgba(52, 199, 89, 0.11);
}
.field-list {
  border-top: 1px solid var(--hairline);
}
.number-field,
.choice-field {
  border-bottom: 1px solid var(--hairline);
}
.number-field:last-child,
.choice-field:last-child {
  border-bottom: 0;
}
.number-field {
  padding: 9px 0;
}
.number-field__main {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 15px;
  font-weight: 650;
  color: var(--text-dark);
}
.number-field__control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}
.number-field input {
  width: 112px;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  outline: none;
  text-align: right;
  background: var(--bg-fill);
  color: var(--text-dark);
  font: inherit;
}
.number-field input:focus {
  box-shadow: 0 0 0 2px var(--primary-soft);
}
.number-field input::placeholder {
  font-size: 13px;
  color: var(--text-light);
}
.number-field small {
  width: 24px;
  font-size: 11px;
  font-weight: 650;
  color: var(--text-gray);
}
.choice-field {
  padding: 15px 0;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 10px;
}
.choice-field__label {
  font-size: 15px;
  font-weight: 650;
  color: var(--text-dark);
}
.choice-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.choice-grid--wrap {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.choice {
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--bg-fill);
  color: var(--text-gray);
  font-size: 13px;
  font-weight: 700;
}
.choice--selected {
  border-color: var(--button-secondary-border);
  background: var(--gradient-button-secondary);
  color: var(--primary);
}
.field-error {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #b54708;
}
.model-note {
  padding: 0 8px 12px;
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
  color: var(--text-light);
}
@media (max-width: 360px) {
  .choice-grid--wrap {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<template>
  <div class="profile">
    <PageHeader title="我的" />

    <section v-if="!auth.loggedIn" class="guest" aria-labelledby="guest-title">
      <div class="guest__mark"><AppIcon name="sparkle" :size="30" /></div>
      <h2 id="guest-title">登录后，开启你的专属穿搭空间</h2>
      <p>保存身体数据、管理电子衣柜，也保留每一次为你生成的穿搭。</p>
      <button class="guest__cta" @click="auth.openAuth('login')">注册 / 登录</button>
    </section>

    <template v-else>
      <section class="identity-card">
        <button class="avatar" aria-label="添加或修改头像" @click="onAvatarClick">
          <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="用户头像" />
          <AppIcon v-else name="user" :size="30" />
          <span class="avatar__add" aria-hidden="true"></span>
        </button>

        <div class="identity-card__copy">
          <h2>{{ displayName }}</h2>
          <p v-if="showEmail">{{ auth.user?.email }}</p>
          <div class="model-state" :class="{ 'model-state--ready': modelReady }">
            <span class="model-state__dot"></span>
            {{ modelReady ? '专属模特已准备' : '等待创建专属模特' }}
          </div>
        </div>
      </section>

      <section class="settings" aria-label="个人设置">
        <button class="settings-row" @click="goBodyData">
          <span class="settings-row__icon settings-row__icon--body">
            <AppIcon name="body" :size="22" />
          </span>
          <span class="settings-row__copy">
            <strong>身体数据</strong>
            <small>{{ bodySummary }}</small>
          </span>
          <span
            class="settings-row__status"
            :class="{
              'settings-row__status--done': bodyState === 'ready' && !profileStore.loading,
              'settings-row__status--invalid': bodyState === 'invalid' || profileStore.error,
            }"
          >
            {{ bodyStatusText }}
          </span>
          <AppIcon name="chevron-left" :size="17" class="settings-row__chevron" />
        </button>

        <button class="settings-row" @click="goPreference">
          <span class="settings-row__icon">
            <AppIcon name="heart" :size="21" />
          </span>
          <span class="settings-row__copy">
            <strong>穿搭偏好与收藏</strong>
            <small>管理风格、颜色和收藏记录</small>
          </span>
          <AppIcon name="chevron-left" :size="17" class="settings-row__chevron" />
        </button>

        <button class="settings-row" @click="theme.toggle">
          <span class="settings-row__icon">
            <AppIcon name="brush-up" :size="24" />
          </span>
          <span class="settings-row__copy">
            <strong>界面主题</strong>
            <small>{{ theme.current.value === 'lunar' ? '月影' : '默认' }}</small>
          </span>
          <span
            class="theme-dot"
            :class="{ 'theme-dot--lunar': theme.current.value === 'lunar' }"
          ></span>
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
import { ROUTES } from '@/constants/routes';
import { useEnums } from '@/composables/useEnums';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';
import { useNotifyStore } from '@/stores/notify';
import { useProfileStore } from '@/stores/profile';
import { createBodyDataDraft } from '@/utils/profile/bodyData';
import {
  bodyDataEnumCatalogFromTypes,
  bodyDataPresentationState,
  bodyDataSummary,
  profileDisplayName,
} from './profilePresentation';

const router = useRouter();
const auth = useAuthStore();
const profileStore = useProfileStore();
const notify = useNotifyStore();
const enums = useEnums();
const theme = useTheme();

const displayName = computed(() => profileDisplayName(auth.user));
const showEmail = computed(() => Boolean(auth.user?.nickname?.trim() && auth.user?.email?.trim()));
const modelReady = computed(() => Boolean(auth.user?.avatar_url));
const enumCatalog = computed(() => bodyDataEnumCatalogFromTypes(enums.types.value));

// CODEX-PHASE-5：“我的”与身体数据页使用同一份草稿、枚举和领域规则计算状态。
// 原因：只检查身高、体重和体型会漏掉性别、肤色以及非法输入，错误显示为已完成。
const bodyState = computed(() =>
  bodyDataPresentationState(createBodyDataDraft(profileStore.profile), enumCatalog.value),
);
const bodyStatusText = computed(() => {
  if (profileStore.loading) return '读取中';
  const labels = {
    incomplete: '待完善',
    invalid: '待修正',
    ready: '已完成',
  } as const;
  return labels[bodyState.value];
});
const bodySummary = computed(() => {
  if (profileStore.loading) return '正在读取身体资料…';
  if (profileStore.error) return '读取失败，进入后可重试';
  const bodyType = profileStore.profile.bodyType;
  const bodyTypeLabel = bodyType ? enums.label('body_shape', bodyType) : '';
  return bodyDataSummary(profileStore.profile, bodyTypeLabel);
});

async function loadProfilePage() {
  await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()]);
}

onMounted(() => {
  if (auth.loggedIn) void loadProfilePage();
});

function goBodyData() {
  void router.push({ name: ROUTES.bodyData });
}

function goPreference() {
  void router.push({ name: ROUTES.preference });
}

function onAvatarClick() {
  notify.info('头像上传接口尚待后端确认，本阶段先完成入口样式');
}
</script>

<style scoped lang="scss">
.profile {
  gap: 18px;
}

.guest {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 24px 72px;
  text-align: center;
}
.guest__mark {
  width: 68px;
  height: 68px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: linear-gradient(145deg, #edeefa, #fff 65%);
  box-shadow: 0 18px 45px -24px rgba(74, 79, 176, 0.6);
}
.guest h2 {
  max-width: 290px;
  margin-top: 24px;
  font-size: 26px;
  line-height: 1.25;
  letter-spacing: -0.6px;
  color: var(--text-dark);
}
.guest p {
  max-width: 300px;
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-gray);
}
.guest__cta {
  width: min(100%, 300px);
  margin-top: 30px;
  padding: 15px 20px;
  border: 1px solid var(--button-primary-border);
  border-radius: var(--radius-md);
  background: var(--gradient-button-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 750;
}

.identity-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border: 1px solid rgba(74, 79, 176, 0.08);
  border-radius: var(--radius-lg);
  background: linear-gradient(138deg, #eceefb 0%, #fff 58%, #faf5ea 100%);
  box-shadow: var(--shadow-card);
}
.avatar {
  position: relative;
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #dfe2f4;
  color: var(--primary);
  box-shadow: 0 10px 28px -16px rgba(35, 42, 92, 0.65);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar__add {
  position: absolute;
  inset: 0;
  background: rgba(17, 20, 34, 0.22);
  transition: background 0.18s ease;
}
.avatar__add::before,
.avatar__add::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 2px;
  border-radius: 99px;
  background: #fff;
  transform: translate(-50%, -50%);
}
.avatar__add::after {
  transform: translate(-50%, -50%) rotate(90deg);
}
.avatar:hover .avatar__add,
.avatar:focus-visible .avatar__add {
  background: rgba(17, 20, 34, 0.32);
}
.identity-card__copy {
  min-width: 0;
}
.identity-card__copy h2 {
  overflow: hidden;
  font-size: 23px;
  line-height: 1.2;
  letter-spacing: -0.4px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-dark);
}
.identity-card__copy p {
  margin-top: 5px;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-gray);
}
.model-state {
  width: fit-content;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-gray);
}
.model-state__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warning);
}
.model-state--ready .model-state__dot {
  background: var(--success);
}

.settings {
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}
.settings-row {
  position: relative;
  width: 100%;
  min-height: 78px;
  padding: 14px 16px;
  border: 0;
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  background: transparent;
  color: var(--text-dark);
}
.settings-row + .settings-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 16px;
  left: 62px;
  height: 1px;
  background: var(--hairline);
}
.settings-row:active {
  background: var(--bg-fill);
}
.settings-row__icon {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: var(--primary-soft);
}
.settings-row__icon--body {
  color: #8b6a27;
  background: rgba(217, 165, 76, 0.14);
}
.settings-row__copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.settings-row__copy strong {
  font-size: 15px;
}
.settings-row__copy small {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-gray);
}
.settings-row__status {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 750;
  color: #9a6b12;
  background: rgba(255, 149, 0, 0.1);
}
.settings-row__status--invalid {
  color: #b54708;
  background: rgba(240, 68, 56, 0.1);
}
.settings-row__status--done {
  color: #237a3b;
  background: rgba(52, 199, 89, 0.11);
}
.settings-row__chevron {
  flex: 0 0 auto;
  color: var(--text-light);
  transform: rotate(180deg);
}
.theme-dot {
  width: 24px;
  height: 24px;
  border: 5px solid #fff;
  border-radius: 50%;
  background: #6c5ce7;
  box-shadow: 0 0 0 1px var(--hairline);
}
.theme-dot--lunar {
  background: #4a4fb0;
}
</style>

<template>
  <header class="page-header" :class="{ 'page-header--nav': back }">
    <!-- 导航式：左返回 -->
    <button v-if="back" class="page-header__back" aria-label="返回" @click="emit('back')">
      <AppIcon name="chevron-left" :size="22" />
    </button>

    <div class="page-header__titles">
      <div v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</div>
      <h1 class="page-header__title">{{ title }}</h1>
    </div>

    <!-- 右侧动作由使用方决定（首页放头像、衣柜放相机、工坊放保存…）-->
    <div :class="back ? 'page-header__action__back' : 'page-header__action'">
      <slot name="action" />
    </div>
  </header>
</template>

<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue';

defineProps<{
  title: string;
  subtitle?: string; // 可选：大标题上方的小副标（如日期）
  back?: boolean; // true → 导航式（左返回 + 居中小标题），用于全屏浮层（工坊/拍照）
}>();
const emit = defineEmits<{ back: [] }>();
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header__titles {
  min-width: 0;
}
.page-header__subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-light);
}
.page-header__title {
  font-size: 30px;
  font-weight: 800;
  line-height: 2.5;
  letter-spacing: -0.8px;
  color: var(--text-dark);
}
.page-header__action {
  flex-shrink: 0; // 右侧动作不被长标题挤压
}

.page-header__action__back {
  flex-shrink: 0; // 右侧动作不被长标题挤压
  display: flex;
  // justify-self: center;
  // align-items: center;
  width: 38px;
  height: 38px;
}

/* ===== 导航式（back=true）：左返回 + 居中小标题 + 右动作 ===== */
.page-header--nav {
  justify-content: flex-start;
  gap: 8px;
  padding-top: var(--safe-page-top-gap);

  .page-header__titles {
    flex: 1;
    text-align: center;
  }
  .page-header__title {
    font-size: 17px;
    line-height: 1.4;
  }
}
.page-header__back {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
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
</style>

<template>
  <header class="page-header">
    <div class="page-header__titles">
      <div v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</div>
      <h1 class="page-header__title">{{ title }}</h1>
    </div>
    <!-- 右侧动作由使用方决定（首页放头像、衣柜放相机…）-->
    <div class="page-header__action">
      <slot name="action" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string; // 可选：大标题上方的小副标（如日期）
}>();
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
</style>

<template>
  <nav class="tab-bar">
    <router-link
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="tab-item"
      active-class="tab-item--active"
    >
      <AppIcon :name="tab.icon" :size="25" />
      <span class="tab-item__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue';
import { ROUTES } from '@/constants/routes';
import type { IconName } from '@/components/icons/icons';

interface Tab {
  name: string;
  label: string;
  icon: IconName;
}

const tabs: Tab[] = [
  { name: ROUTES.home, label: '首页', icon: 'home' },
  { name: ROUTES.wardrobe, label: '衣柜', icon: 'dress' },
  { name: ROUTES.preference, label: '偏好', icon: 'heart' },
  { name: ROUTES.profile, label: '我的', icon: 'user' },
];
</script>

<style scoped lang="scss">
.tab-bar {
  position: absolute; // 脱离文档流，浮在内容上
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-shrink: 0;
  border-top: 1px solid var(--hairline);
  background: var(--surface-navigation); // 磨砂玻璃：由主题 token 控制半透明底
  backdrop-filter: blur(20px) saturate(180%); // + 背景模糊
  -webkit-backdrop-filter: blur(20px) saturate(180%); // Safari 需前缀
  padding-bottom: var(--safe-bottom); // 坐在安全区之上
}
.tab-item {
  flex: 1; // 4 个均分宽度
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: var(--tab-height); // + 安全区 ≈ 84px
  color: var(--text-light); // 未选中：灰
  font-size: 10px;
  font-weight: 500;
  text-decoration: none; // 去下划线
  transition: color 0.2s;
  &:active {
    transform: scale(0.92);
  }
}
.tab-item--active {
  // 选中：紫 + 粗
  color: var(--primary);
  font-weight: 700;
}
.tab-item__label {
  line-height: 1;
}
</style>

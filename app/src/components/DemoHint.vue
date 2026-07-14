<template>
  <!-- 仅演示构建可见；正式包里 DEMO=false → 整段（含文案）被打包器 DCE 删除 -->
  <p v-if="DEMO" class="demo-hint">
    <slot>{{ text }}</slot>
  </p>
</template>

<script setup lang="ts">
import { DEMO } from '@/constants/demo';
defineProps<{ text?: string }>(); // 简单文案用 text；复杂内容用默认插槽
</script>

<style scoped lang="scss">
.demo-hint {
  margin: 0 2px 4px;
  font-size: 13px;
  color: var(--text-light);
}
</style>

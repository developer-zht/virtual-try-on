<!--
  说明：本组件不写 <style>。nav-bar / nav-left / nav-title / nav-right 这些类
  放在全局 app.scss 里——因为右侧操作是页面通过“插槽”传进来的，
  scoped 样式管不到插槽内容，所以这类“会被插槽复用”的通用类放全局最省心。
-->

<template>
  <div class="nav-bar">
    <!-- 左侧：默认是“返回”按钮（showBack 时显示）；可用 #left 插槽整体替换（如首页头像）-->
    <slot name="left">
      <div v-if="showBack" class="nav-left" @click="emit('back')">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        返回
      </div>
      <div v-else class="nav-spacer" />
    </slot>

    <!-- 中间：标题 -->
    <div class="nav-title">{{ title }}</div>

    <!-- 右侧：操作插槽（页面放 <div class="nav-right">）；不传就用占位保持标题居中 -->
    <slot name="right">
      <div class="nav-spacer" />
    </slot>
  </div>
</template>

<script setup lang="ts">
// title：中间标题；showBack：是否显示左侧返回按钮
defineProps<{ title?: string; showBack?: boolean }>();
// back：点返回时通知父组件（父决定跳哪）
const emit = defineEmits<{ back: [] }>();
</script>

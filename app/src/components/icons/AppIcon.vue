<template>
  <!--
    统一的线性图标：外层 <svg> 固定所有“共性”属性（viewBox / 线帽 / 圆角 / 线宽），
    形状则由 v-html 注入注册表里的子元素。stroke="currentColor" 是关键：
    图标颜色不写死，而是“继承父元素的 color”，所以父级 color:var(--primary) 图标就变紫。
  -->
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="shape"
  ></svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { icons, type IconName } from './icons';

// 类型化 props：name 被限定为注册表里的合法图标名（写错会被 vue-tsc 拦下）。
// withDefaults 给可选 prop 设默认值：默认 24px、线宽 1.8（对齐设计稿主流值）。
const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: number | string;
    strokeWidth?: number | string;
  }>(),
  {
    size: 24,
    strokeWidth: 1.8,
  },
);

// computed：name 变化时自动取对应形状。用 ?? '' 兜底，避免 undefined。
const shape = computed(() => icons[props.name] ?? '');

// 安全说明：v-html 会把字符串当 HTML 插入，若内容来自“用户输入”会有 XSS 风险。
// 这里 icons 全是我们自己写死的静态常量、绝不含用户数据，所以安全。
</script>

<style scoped lang="scss">
.app-icon {
  display: block; // 去掉 inline 元素底部的基线间隙
  flex-shrink: 0; // 在 flex 布局里不被压扁
}
</style>

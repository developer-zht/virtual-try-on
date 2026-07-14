<template>
  <div class="garment-thumb">
    <!-- 有真实白底图 → <img>；否则回退线性图标 -->
    <img v-if="resolvedSrc" :src="resolvedSrc" :alt="name ?? ''" class="garment-thumb__img" />
    <AppIcon v-else :name="icon" :size="iconSize" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import { GARMENT_IMG } from '@/constants/garments';
import type { IconName } from '@/components/icons/icons';

const props = withDefaults(
  defineProps<{
    src?: string; // 直接给图片 URL（真实衣物用 display_image_url）
    name?: string; // 或给单品名查 GARMENT_IMG（首页占位用）
    icon?: IconName; // 无图时回退图标
    iconSize?: number;
  }>(),
  { icon: 'dress', iconSize: 30 },
);

// 优先用直接传的 src；否则按 name 查映射表；都没有 → 回退图标
const resolvedSrc = computed(() => props.src ?? (props.name ? GARMENT_IMG[props.name] : undefined));
</script>

<style scoped lang="scss">
// v3：服装图片容器 = 白底 + 极浅描边 + overflow:hidden（不再用灰底，白底图才不糊）
.garment-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: inherit; // 跟随父容器圆角
  background: var(--bg-card); // 白底
  box-shadow: inset 0 0 0 1px var(--hairline); // 极浅描边（inset 不占尺寸）
  color: var(--text-light); // 回退图标颜色
}
.garment-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: contain; // 服装完整显示不裁切
  padding: 8px; // 四周留白
}
</style>

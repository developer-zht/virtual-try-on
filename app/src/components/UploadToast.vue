<template>
  <!-- 持久进度 toast：识别期间常驻，跨页面存在（挂在 MainLayout）-->
  <transition name="toast-pop">
    <div v-if="wardrobe.importing" class="toast">
      <div class="toast__ring"></div>
      <div class="toast__body">
        <div class="toast__title">
          识别中<span v-if="processingCount > 1"> · {{ processingCount }} 件</span>
        </div>
        <div class="toast__bar">
          <div class="toast__fill" :style="{ width: wardrobe.importProgress + '%' }"></div>
        </div>
      </div>
      <div class="toast__pct">{{ wardrobe.importProgress }}%</div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWardrobeStore } from '@/stores/wardrobe';

const wardrobe = useWardrobeStore();

// 还在识别的件数（processing_status 不是 ready 的）
const processingCount = computed(
  () => wardrobe.items.filter((i) => i.processing_status !== 'ready').length,
);
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 16px;
  right: 16px;
  z-index: 900; // 低于 AuthSheet(1000)，高于页面/Tab
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  // 磨砂
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
.toast__ring {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid var(--primary-soft);
  border-top-color: var(--primary); // 缺口染主色 → 转成 spinner
  animation: vc-spin 0.8s linear infinite;
}
.toast__body {
  flex: 1;
  min-width: 0; // 防止内容把 toast 撑破
}
.toast__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}
.toast__bar {
  margin-top: 6px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--bg-fill);
  overflow: hidden;
}
.toast__fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-pill);
  transition: width 0.2s ease;
}
.toast__pct {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-gray);
}

// 进出动画：从顶部滑入淡出
.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@keyframes vc-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

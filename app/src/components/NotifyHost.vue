<template>
  <Teleport to="body">
    <div class="notify-host">
      <TransitionGroup name="notify-pop">
        <div
          v-for="t in notify.toasts"
          :key="t.id"
          class="notify"
          :class="`notify--${t.type}`"
          role="status"
          @click="notify.dismiss(t.id)"
        >
          <span class="notify__badge">{{ GLYPH[t.type] }}</span>
          <span class="notify__msg">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotifyStore } from '@/stores/notify';
import type { NotifyType } from '@/stores/types/notify';
const notify = useNotifyStore();
const GLYPH: Record<NotifyType, string> = { success: '✓', error: '✕', warning: '!', info: 'i' };
</script>

<style scoped lang="scss">
.notify-host {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--safe-toast-top-gap));
  left: 16px;
  right: 16px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.notify {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}
.notify__badge {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: var(--text-gray);
}
.notify__msg {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dark);
  line-height: 1.4;
}
.notify--success .notify__badge {
  background: var(--success);
}
.notify--error .notify__badge {
  background: var(--danger);
}
.notify--warning .notify__badge {
  background: var(--warning);
}
.notify--info .notify__badge {
  background: var(--primary);
}
.notify-pop-enter-active,
.notify-pop-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.notify-pop-enter-from,
.notify-pop-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
.notify-pop-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
</style>

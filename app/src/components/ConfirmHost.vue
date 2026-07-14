<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="s" class="confirm" @click.self="onCancel">
        <div class="confirm__card">
          <div v-if="s.title" class="confirm__title">{{ s.title }}</div>
          <div v-if="s.message" class="confirm__msg">{{ s.message }}</div>
          <div class="confirm__actions">
            <button class="confirm__btn confirm__btn--ghost" @click="onCancel">
              {{ s.cancelText }}
            </button>
            <button
              class="confirm__btn"
              :class="s.danger ? 'confirm__btn--danger' : 'confirm__btn--primary'"
              @click="onOk"
            >
              {{ s.okText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useNotifyStore } from '@/stores/notify';
const notify = useNotifyStore();
const s = computed(() => notify.confirmState);
function onOk() {
  notify.settleConfirm(true);
}
function onCancel() {
  notify.settleConfirm(false);
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && notify.confirmState) onCancel();
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<style scoped lang="scss">
.confirm {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.confirm__card {
  width: 100%;
  max-width: 300px;
  padding: 22px 20px 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-hero);
  text-align: center;
}
.confirm__title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-dark);
}
.confirm__msg {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-gray);
}
.confirm__actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
.confirm__btn {
  flex: 1;
  padding: 11px 0;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.1s,
    opacity 0.15s;
  &:active {
    transform: scale(0.97);
  }
}
.confirm__btn--ghost {
  background: var(--bg-fill);
  color: var(--text-gray);
}
.confirm__btn--primary {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
.confirm__btn--danger {
  background: var(--danger);
  color: #fff;
}
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
.confirm-fade-enter-active .confirm__card {
  animation: confirm-rise 0.22s cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes confirm-rise {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

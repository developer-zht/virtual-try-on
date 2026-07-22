<template>
  <Teleport to="body">
    <Transition name="decision-fade">
      <div v-if="state" class="decision-dialog" @click.self="onBackdrop">
        <div
          ref="dialogCard"
          class="decision-dialog__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decision-dialog-title"
          :aria-describedby="state.message ? 'decision-dialog-message' : undefined"
        >
          <h2 id="decision-dialog-title" class="decision-dialog__title">
            {{ state.title }}
          </h2>
          <p v-if="state.message" id="decision-dialog-message" class="decision-dialog__message">
            {{ state.message }}
          </p>

          <div class="decision-dialog__actions">
            <button
              v-for="action in state.actions"
              :key="action.value"
              type="button"
              class="decision-dialog__button"
              :class="`decision-dialog__button--${action.tone ?? 'quiet'}`"
              :disabled="action.disabled"
              @click="dialog.settle(action.value)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useDecisionDialogStore } from '@/stores/decisionDialog';

const dialog = useDecisionDialogStore();
const state = computed(() => dialog.state);
const dialogCard = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;
let previousBodyOverflow: string | null = null;

function enabledActionButtons(): HTMLButtonElement[] {
  return dialogCard.value
    ? Array.from(dialogCard.value.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    : [];
}

function focusFirstAction(): void {
  enabledActionButtons()[0]?.focus();
}

function lockBodyScroll(): void {
  if (previousBodyOverflow !== null) return;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
}

function restoreBodyScroll(): void {
  if (previousBodyOverflow === null) return;
  document.body.style.overflow = previousBodyOverflow;
  previousBodyOverflow = null;
}

function restoreFocus(): void {
  const target = previousFocus;
  previousFocus = null;
  if (target?.isConnected) target.focus();
}

function onBackdrop(): void {
  if (state.value?.closeOnBackdrop) dialog.dismiss();
}

// Escape 使用调用方的安全 dismissValue，Tab 始终留在当前 Dialog。
// 原因：全局弹窗不能隐式执行破坏性动作，也不能让键盘焦点逃到被遮挡页面。
function onKey(event: KeyboardEvent): void {
  if (!state.value) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.dismiss();
    return;
  }

  if (event.key !== 'Tab') return;
  const buttons = enabledActionButtons();
  if (buttons.length === 0) {
    event.preventDefault();
    return;
  }

  const first = buttons[0];
  const last = buttons.at(-1);
  const active = document.activeElement;
  const focusOutside = !dialogCard.value?.contains(active);

  if (event.shiftKey && (active === first || focusOutside)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || focusOutside)) {
    event.preventDefault();
    first?.focus();
  }
}

// Host 统一管理打开前焦点和 body 滚动，并在关闭后精确恢复。
// 原因：页面调用方只应描述选择，不应重复实现全局 Modal 的可访问性生命周期。
watch(
  () => Boolean(state.value),
  async (open, wasOpen) => {
    if (open && !wasOpen) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      lockBodyScroll();
      await nextTick();
      focusFirstAction();
      return;
    }

    if (!open && wasOpen) {
      restoreBodyScroll();
      await nextTick();
      restoreFocus();
    }
  },
  { flush: 'post' },
);

onMounted(() => window.addEventListener('keydown', onKey));

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  dialog.dismiss();
  restoreBodyScroll();
  restoreFocus();
});
</script>

<style scoped lang="scss">
.decision-dialog {
  position: fixed;
  inset: 0;
  z-index: 1400;
  padding: 28px;
  display: grid;
  place-items: center;
  background: rgba(13, 16, 28, 0.38);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  touch-action: none;
  overscroll-behavior: contain;
}

.decision-dialog__card {
  width: min(100%, 330px);
  padding: 24px 20px 18px;
  border-radius: var(--radius-lg);
  text-align: center;
  background: var(--bg-card);
  box-shadow: var(--shadow-hero);
}

.decision-dialog__title {
  font-size: 18px;
  color: var(--text-dark);
}

.decision-dialog__message {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-gray);
}

.decision-dialog__actions {
  margin-top: 20px;
  display: grid;
  gap: 8px;
}

.decision-dialog__button {
  min-height: 42px;
  padding: 9px 14px;
  border: 0;
  border-radius: 13px;
  font-size: 14px;
  font-weight: 750;
  transition:
    transform 0.1s ease,
    opacity 0.15s ease;
}

.decision-dialog__button:active:not(:disabled) {
  transform: scale(0.98);
}

.decision-dialog__button--quiet {
  background: var(--bg-fill);
  color: var(--text-gray);
}

.decision-dialog__button--primary {
  border: 1px solid var(--button-primary-border);
  background: var(--gradient-button-primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}

.decision-dialog__button--danger {
  background: var(--danger);
  color: #fff;
}

.decision-dialog__button:disabled {
  opacity: 0.42;
}

.decision-fade-enter-active,
.decision-fade-leave-active {
  transition: opacity 0.18s ease;
}

.decision-fade-enter-from,
.decision-fade-leave-to {
  opacity: 0;
}

.decision-fade-enter-active .decision-dialog__card {
  animation: decision-rise 0.2s cubic-bezier(0.2, 0.7, 0.2, 1);
}

@keyframes decision-rise {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConfirmOptions, NotifyType, Toast } from './types/notify';

export const useNotifyStore = defineStore('notify', () => {
  const toasts = ref<Toast[]>([
    // {
    //   id: 1,
    //   type: 'error',
    //   message: 'Debug 样例，持续时间 24 h',
    //   timeout: 86_400,
    // },
  ]);
  let seq = 0;
  function push(type: NotifyType, message: string, timeout = 2600): number {
    const id = ++seq;
    toasts.value.push({ id, type, message, timeout });
    if (timeout > 0) window.setTimeout(() => dismiss(id), timeout);
    return id;
  }
  function dismiss(id: number) {
    const i = toasts.value.findIndex((t) => t.id === id);
    if (i !== -1) toasts.value.splice(i, 1);
  }
  const success = (message: string, timeoutMs?: number) => push('success', message, timeoutMs);
  const error = (message: string, timeoutMs?: number) => push('error', message, timeoutMs ?? 3600);
  const warning = (message: string, timeoutMs?: number) => push('warning', message, timeoutMs);
  const info = (message: string, timeoutMs?: number) => push('info', message, timeoutMs);

  const confirmState = ref<ConfirmOptions | null>(null);
  let resolver: ((ok: boolean) => void) | null = null;
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    resolver?.(false);
    return new Promise<boolean>((resolve) => {
      resolver = resolve;
      confirmState.value = {
        title: '确认',
        okText: '确定',
        cancelText: '取消',
        danger: false,
        ...opts,
      };
    });
  }
  function settleConfirm(ok: boolean) {
    resolver?.(ok);
    resolver = null;
    confirmState.value = null;
  }

  return {
    toasts,
    push,
    dismiss,
    success,
    error,
    warning,
    info,
    confirmState,
    confirm,
    settleConfirm,
  };
});

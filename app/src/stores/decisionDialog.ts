/**
 * 用独立 Pinia Store 管理一个全局多选 Decision Dialog。
 * 原因：多个页面应共享 Promise 选择、并发收敛和安全关闭规则，同时不扩大二选一 ConfirmHost 的职责。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DecisionDialogOptions, DecisionDialogState } from './types/decisionDialog';

type DecisionResolver = (value: string) => void;

function validateOptions<Value extends string>(options: DecisionDialogOptions<Value>): void {
  if (options.actions.length === 0) {
    throw new Error('Decision Dialog 至少需要一个动作');
  }

  const values = options.actions.map((action) => action.value);
  if (new Set(values).size !== values.length) {
    throw new Error('Decision Dialog 动作值不能重复');
  }

  if (!values.includes(options.dismissValue)) {
    throw new Error('Decision Dialog 的 dismissValue 必须对应一个动作');
  }
}

function createState<Value extends string>(
  options: DecisionDialogOptions<Value>,
): DecisionDialogState {
  return {
    title: options.title,
    message: options.message,
    actions: options.actions.map((action) => ({ ...action })),
    dismissValue: options.dismissValue,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
  };
}

export const useDecisionDialogStore = defineStore('decision-dialog', () => {
  const state = ref<DecisionDialogState | null>(null);
  let resolver: DecisionResolver | null = null;

  // 先清空全局引用，再唤醒等待方。
  // 原因：await 后续代码可能同步打开下一个 Dialog，不能看到或覆盖旧 resolver/state。
  function complete(value: string): void {
    const resolve = resolver;
    resolver = null;
    state.value = null;
    resolve?.(value);
  }

  function choose<Value extends string>(options: DecisionDialogOptions<Value>): Promise<Value> {
    validateOptions(options);

    // 全局只允许一个决策弹窗；新请求先安全结束旧请求。
    // 原因：直接覆盖 resolver 会让旧 Promise 永远停在 pending。
    if (state.value) complete(state.value.dismissValue);

    return new Promise<Value>((resolve) => {
      resolver = (value) => resolve(value as Value);
      state.value = createState(options);
    });
  }

  function settle(value: string): void {
    const action = state.value?.actions.find((item) => item.value === value);
    if (!action || action.disabled) return;
    complete(action.value);
  }

  function dismiss(): void {
    const current = state.value;
    if (!current) return;
    complete(current.dismissValue);
  }

  return {
    state,
    choose,
    settle,
    dismiss,
  };
});

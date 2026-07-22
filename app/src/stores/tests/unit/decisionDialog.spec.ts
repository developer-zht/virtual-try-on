/**
 * 测试类型：单元测试。
 * 测试对象/范围：Decision Dialog Store 的打开、选择、关闭、并发替换、禁用动作和配置约束。
 * 隔离内容：创建独立 Pinia；不挂载 Vue 组件、不触发 Router、不发送网络请求。
 * 修改原因：先定义全局多选 Dialog 的 Promise 结果与单实例不变量，再实现 Store。
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDecisionDialogStore } from '../../decisionDialog';
import type { DecisionDialogOptions } from '../../types/decisionDialog';

type LeaveChoice = 'stay' | 'discard' | 'save';

function leaveOptions(
  overrides: Partial<DecisionDialogOptions<LeaveChoice>> = {},
): DecisionDialogOptions<LeaveChoice> {
  return {
    title: '有未保存的更改',
    message: '离开前要保存吗？',
    actions: [
      { value: 'stay', label: '继续编辑', tone: 'quiet' },
      { value: 'discard', label: '放弃更改', tone: 'quiet' },
      { value: 'save', label: '保存并离开', tone: 'primary' },
    ],
    dismissValue: 'stay',
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('Decision Dialog 结果', () => {
  it('选择可用动作后返回动作值并清空全局状态', async () => {
    const store = useDecisionDialogStore();
    const pending = store.choose(leaveOptions());

    expect(store.state).toMatchObject({
      title: '有未保存的更改',
      dismissValue: 'stay',
      closeOnBackdrop: true,
    });

    store.settle('save');

    await expect(pending).resolves.toBe('save');
    expect(store.state).toBeNull();
  });

  it('关闭弹窗时返回调用方声明的安全 dismissValue', async () => {
    const store = useDecisionDialogStore();
    const pending = store.choose(leaveOptions());

    store.dismiss();

    await expect(pending).resolves.toBe('stay');
    expect(store.state).toBeNull();
  });

  it('新询问用旧询问自己的 dismissValue 收敛旧 Promise', async () => {
    const store = useDecisionDialogStore();
    const first = store.choose(leaveOptions());
    const second = store.choose(
      leaveOptions({
        title: '第二个询问',
        dismissValue: 'discard',
      }),
    );

    await expect(first).resolves.toBe('stay');
    expect(store.state?.title).toBe('第二个询问');

    store.dismiss();
    await expect(second).resolves.toBe('discard');
  });

  it('忽略不存在或已禁用动作，不提前完成 Promise', async () => {
    const store = useDecisionDialogStore();
    const pending = store.choose(
      leaveOptions({
        actions: [
          { value: 'stay', label: '继续编辑' },
          { value: 'discard', label: '放弃更改' },
          { value: 'save', label: '保存并离开', disabled: true },
        ],
      }),
    );

    store.settle('missing');
    store.settle('save');
    expect(store.state).not.toBeNull();

    store.settle('discard');
    await expect(pending).resolves.toBe('discard');
  });
});

describe('Decision Dialog 配置约束', () => {
  it('拒绝空动作列表', () => {
    const store = useDecisionDialogStore();

    expect(() =>
      store.choose(
        leaveOptions({
          actions: [],
        }),
      ),
    ).toThrow('Decision Dialog 至少需要一个动作');
  });

  it('拒绝重复动作值', () => {
    const store = useDecisionDialogStore();

    expect(() =>
      store.choose(
        leaveOptions({
          actions: [
            { value: 'stay', label: '继续编辑' },
            { value: 'stay', label: '仍然编辑' },
          ],
        }),
      ),
    ).toThrow('Decision Dialog 动作值不能重复');
  });

  it('拒绝不在动作列表中的 dismissValue', () => {
    const store = useDecisionDialogStore();

    expect(() =>
      store.choose(
        leaveOptions({
          actions: [
            { value: 'discard', label: '放弃更改' },
            { value: 'save', label: '保存并离开' },
          ],
        }),
      ),
    ).toThrow('Decision Dialog 的 dismissValue 必须对应一个动作');
  });
});

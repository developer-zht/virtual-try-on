/**
 * 测试类型：集成测试。
 * 测试对象/范围：DecisionDialogHost 对全局 Store、动态动作、关闭交互、焦点管理和背景滚动的接线。
 * 隔离内容：不挂载 Vue、不创建真实 DOM、不触发 Router；沿用项目源码集成测试方式，Store 行为由单元测试覆盖。
 * 修改原因：先锁定全局 Host 的可访问性和生命周期边界，再实现 SFC。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hostSource = readFileSync(new URL('../../DecisionDialogHost.vue', import.meta.url), 'utf8');

describe('DecisionDialogHost 全局渲染', () => {
  it('通过 Teleport 渲染带语义的动态动作列表', () => {
    expect(hostSource).toContain('<Teleport to="body">');
    expect(hostSource).toContain('role="dialog"');
    expect(hostSource).toContain('aria-modal="true"');
    expect(hostSource).toContain('v-for="action in state.actions"');
    expect(hostSource).toContain(':disabled="action.disabled"');
    expect(hostSource).toContain('dialog.settle(action.value)');
  });

  it('只在允许时通过遮罩关闭，并用 Escape 执行安全 dismiss', () => {
    expect(hostSource).toContain('closeOnBackdrop');
    expect(hostSource).toContain("event.key === 'Escape'");
    expect(hostSource).toContain('dialog.dismiss()');
  });
});

describe('DecisionDialogHost 可访问性生命周期', () => {
  it('打开后管理初始焦点和 Tab 循环，关闭后恢复原焦点', () => {
    expect(hostSource).toContain('previousFocus');
    expect(hostSource).toContain('focusFirstAction');
    expect(hostSource).toContain("event.key !== 'Tab'");
    expect(hostSource).toContain('restoreFocus');
  });

  it('打开时锁定 body 滚动，并在关闭或卸载时清理', () => {
    expect(hostSource).toContain('document.body.style.overflow');
    expect(hostSource).toContain('lockBodyScroll');
    expect(hostSource).toContain('restoreBodyScroll');
    expect(hostSource).toContain('onUnmounted');
  });
});

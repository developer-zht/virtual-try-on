/**
 * 测试类型：集成测试。
 * 测试对象/范围：BodyDataPage 对身体数据领域规则、Profile Store 保存、路由返回和新增外观字段的接线。
 * 隔离内容：不挂载 Vue、不启动 MSW、不连接真实 Backend；只检查 SFC 集成边界，纯行为由单元测试覆盖。
 * 修改原因：项目当前没有 Vue Test Utils，沿用已有页面源码集成测试方式锁住关键接线。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('../../BodyDataPage.vue', import.meta.url), 'utf8');

describe('BodyDataPage 身体数据领域接线', () => {
  it('使用统一 bodyData 模块，不再从 profilePresentation 复制业务函数', () => {
    expect(pageSource).toContain("from '@/utils/profile/bodyData'");
    expect(pageSource).toContain("from '@/utils/profile/types/bodyData'");
    expect(pageSource).toContain('bodyDataEnumCatalogFromTypes');
    expect(pageSource).not.toMatch(
      /import\s*{[^}]*createBodyDataDraft[^}]*}\s*from '\.\/profilePresentation'/,
    );
  });

  it('渲染年龄段、发型和发色三个新增可选枚举字段', () => {
    expect(pageSource).toContain('draft.ageRange');
    expect(pageSource).toContain('draft.hairStyle');
    expect(pageSource).toContain('draft.hairColor');
    expect(pageSource).toContain('ageRangeOptions');
    expect(pageSource).toContain('hairStyleOptions');
    expect(pageSource).toContain('hairColorOptions');
  });

  it('保存前同时检查必填完整性和字段合法性', () => {
    expect(pageSource).toContain('validateBodyDataDraft');
    expect(pageSource).toContain('const validationErrors = computed');
    expect(pageSource).toContain('Object.keys(validationErrors.value).length === 0');
    expect(pageSource).toContain('const canSave = computed');
  });
});

describe('BodyDataPage Profile 保存闭环', () => {
  it('把完整候选 Profile 交给 Store，并等待保存成功后才刷新草稿快照', () => {
    expect(pageSource).toContain('async function saveDraft(): Promise<boolean>');
    expect(pageSource).toContain('const nextProfile: ProfileState = {');
    expect(pageSource).toContain('styles: [...profileStore.profile.styles]');
    expect(pageSource).toContain('const saved = await profileStore.saveProfile(nextProfile)');
    expect(pageSource).toContain('resetDraft(createBodyDataDraft(profileStore.profile))');
  });

  it('保存前不修改 Store，失败时无需回滚并保留页面草稿', () => {
    expect(pageSource).not.toContain('captureProfileState');
    expect(pageSource).not.toContain('previousProfile');
    expect(pageSource).not.toContain('Object.assign(profileStore.profile');
    expect(pageSource).toMatch(/if \(!saved\)[\s\S]*return false/);
  });

  it('Header 保存成功后 replace 返回我的页，离开弹窗复用同一个保存函数', () => {
    expect(pageSource).toContain('@click="onHeaderAction"');
    expect(pageSource).toMatch(/pageLoadState\.value === 'ready'[\s\S]*await saveAndReturn\(\)/);
    expect(pageSource).toContain('router.replace({ name: ROUTES.profile })');
    expect(pageSource).toMatch(/choice === 'save'[\s\S]*await saveDraft\(\)/);
  });

  it('移除仅更新本地草稿的阶段提示', () => {
    expect(pageSource).not.toContain('完整后端保存将在下一阶段接入');
  });
});

describe('BodyDataPage 全局离开决策', () => {
  it('通过 Decision Dialog Store 声明三种带类型的离开结果', () => {
    expect(pageSource).toContain("from '@/stores/decisionDialog'");
    expect(pageSource).toContain('decisionDialog.choose<LeaveChoice>');
    expect(pageSource).toContain("dismissValue: 'stay'");
    expect(pageSource).toContain("value: 'stay'");
    expect(pageSource).toContain("value: 'discard'");
    expect(pageSource).toContain("value: 'save'");
    expect(pageSource).toContain('disabled: !canSave.value');
  });

  it('不再维护页面级 resolver、显隐状态和内联 Dialog', () => {
    expect(pageSource).not.toContain('leaveResolver');
    expect(pageSource).not.toContain('showUnsavedDialog');
    expect(pageSource).not.toContain('resolveLeave');
    expect(pageSource).not.toContain('role="dialog"');
    expect(pageSource).not.toContain('.unsaved');
  });
});

describe('BodyDataPage 初始化加载门禁', () => {
  it('初始为 loading，并且只在 ready 时渲染可编辑表单', () => {
    expect(pageSource).toContain("type PageLoadState = 'loading' | 'failed' | 'ready';");
    expect(pageSource).toContain("const pageLoadState = ref<PageLoadState>('loading');");
    expect(pageSource).toContain(`<template v-if="pageLoadState === 'ready'">`);
    expect(pageSource).toContain("pageLoadState.value === 'ready' &&");
  });

  it('顶部同一个按钮在加载、失败和可编辑状态之间切换', () => {
    expect(pageSource).toContain(':disabled="headerActionDisabled"');
    expect(pageSource).toContain('@click="onHeaderAction"');
    expect(pageSource).toContain('{{ headerActionText }}');
    expect(pageSource).toContain("pageLoadState.value === 'loading'");
    expect(pageSource).toContain("pageLoadState.value === 'failed'");
    expect(pageSource).toContain("return '重新加载'");
    expect(pageSource).toContain("return saving.value ? '保存中' : '保存'");
  });

  it('Profile 与枚举都成功后才建立草稿快照并进入 ready', () => {
    expect(pageSource).toMatch(
      /await Promise\.all\(\[enums\.ensureLoaded\(\), profileStore\.fetchProfile\(\)\]\)/,
    );
    expect(pageSource).toContain('profileStore.error');
    expect(pageSource).toContain('!enums.loaded.value');
    expect(pageSource).toMatch(
      /resetDraft\(createBodyDataDraft\(profileStore\.profile\)\);\s*pageLoadState\.value = 'ready'/,
    );
  });

  it('第一次失败提供重新加载或稍后，确认后直接重试且后续不重复自动弹窗', () => {
    expect(pageSource).toContain("pageLoadState.value = 'failed'");
    expect(pageSource).toContain("title: '身体数据读取失败'");
    expect(pageSource).toContain("okText: '重新加载'");
    expect(pageSource).toContain("cancelText: '稍后'");
    expect(pageSource).toContain('hasPromptedLoadFailure');
    expect(pageSource).toContain('await loadPageData(false)');
  });

  it('非 ready 返回时绕过未保存询问，并在卸载后忽略过期请求和关闭本页 Confirm', () => {
    expect(pageSource.match(/pageLoadState\.value !== 'ready' \|\| !isDirty\.value/g)).toHaveLength(
      2,
    );
    expect(pageSource).toContain('onBeforeUnmount');
    expect(pageSource).toContain('loadAttempt += 1');
    expect(pageSource).toContain('notify.settleConfirm(false)');
  });
});

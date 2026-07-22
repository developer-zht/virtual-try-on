/**
 * CODEX-PHASE-5
 * 测试类型：集成测试。
 * 测试对象/范围：ProfilePage 对登录态、Profile 读取、metadata 和统一身体资料展示状态的接线。
 * 隔离内容：不挂载 Vue、不启动 MSW、不连接真实 Backend；只检查 SFC 集成边界，纯状态规则由单元测试覆盖。
 * 修改原因：确保“我的”页不再用旧的 height/weight/bodyType 布尔表达式误判专属模特资料完成度。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('../../ProfilePage.vue', import.meta.url), 'utf8');

describe('ProfilePage 身体资料状态', () => {
  it('使用统一展示适配和身体数据草稿判断状态', () => {
    expect(pageSource).toContain('bodyDataEnumCatalogFromTypes');
    expect(pageSource).toContain('bodyDataPresentationState');
    expect(pageSource).toContain('createBodyDataDraft(profileStore.profile)');
    expect(pageSource).not.toMatch(
      /Boolean\([\s\S]*profileStore\.profile\.height[\s\S]*profileStore\.profile\.bodyType/,
    );
  });

  it('覆盖读取中、待完善、待修正和已完成四种显示文案', () => {
    expect(pageSource).toContain("return '读取中'");
    expect(pageSource).toContain("incomplete: '待完善'");
    expect(pageSource).toContain("invalid: '待修正'");
    expect(pageSource).toContain("ready: '已完成'");
  });

  it('使用统一摘要并对读取失败给出可操作提示', () => {
    expect(pageSource).toContain('bodyDataSummary(');
    expect(pageSource).toContain('profileStore.error');
    expect(pageSource).toContain('读取失败，进入后可重试');
  });
});

describe('ProfilePage 数据加载', () => {
  it('登录后同时加载 metadata 和 Profile', () => {
    expect(pageSource).toContain('async function loadProfilePage()');
    expect(pageSource).toContain(
      'await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()])',
    );
    expect(pageSource).toContain('if (auth.loggedIn) void loadProfilePage()');
  });
});

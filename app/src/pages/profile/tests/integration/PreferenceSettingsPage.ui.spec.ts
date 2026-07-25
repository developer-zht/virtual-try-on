/**
 * 测试类型：UI 集成边界测试。
 * 测试对象/范围：“我的 → 偏好设定”二级页的风格/颜色 UI 草稿、选择上限和常用场合只读区。
 * 隔离内容：不挂载 Vue、不创建 Pinia、不启动 Router、不连接真实 Backend；只检查提案 SFC 的页面接线。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  new URL('../../PreferenceSettingsPage.vue', import.meta.url),
  'utf8',
);
const profilePageSource = readFileSync(new URL('../../ProfilePage.vue', import.meta.url), 'utf8');
const routeNamesSource = readFileSync(
  new URL('../../../../constants/routes.ts', import.meta.url),
  'utf8',
);
const routerSource = readFileSync(new URL('../../../../router/routes.ts', import.meta.url), 'utf8');

describe('PreferenceSettingsPage UI 提案', () => {
  it('使用最新 Profile 创建风格与颜色本地 UI 草稿，并展示 metadata 中文标签', () => {
    expect(pageSource).toContain('<PageHeader title="偏好设定" back');
    expect(pageSource).toContain('const styleDraft = ref<string[]>([])');
    expect(pageSource).toContain('const colorDraft = ref<string[]>([])');
    expect(pageSource).toContain("const styleOptions = computed(() => enums.get('style_tag'))");
    expect(pageSource).toContain("const colorOptions = computed(() => enums.get('color'))");
    expect(pageSource).toContain('resetDraft(createPreferenceDraft(profileStore.profile))');
    expect(pageSource).toContain('const initialSnapshot = ref<PreferenceDraft>');
    expect(pageSource).toContain('{{ option.label_zh }}');
  });

  it('风格最多三个、颜色最多五个，并允许再次点击取消选择', () => {
    expect(pageSource).toContain("toggleSelection(styleDraft, option.value, 3, '风格')");
    expect(pageSource).toContain("toggleSelection(colorDraft, option.value, 5, '颜色')");
    expect(pageSource).toContain('const selectedIndex = draft.indexOf(value)');
    expect(pageSource).toContain('draft.splice(selectedIndex, 1)');
    expect(pageSource).toContain('if (draft.length >= max)');
    expect(pageSource).toContain('notify.info(`${label}最多选择 ${max} 个`)');
  });

  it('把常用场合明确展示为收藏自动统计的只读信息', () => {
    expect(pageSource).toContain('id="settings-occasions"');
    expect(pageSource).toContain('根据收藏自动统计');
    expect(pageSource).toContain('只读');
    expect(pageSource).toContain('v-for="occasion in allOccasions"');
    expect(pageSource).not.toContain('toggleSelection(occasion');
  });

  it('根据 section query 定位区域', () => {
    expect(pageSource).toContain("type PreferenceSection = 'styles' | 'colors' | 'occasions'");
    expect(pageSource).toContain('target?.scrollIntoView');
    expect(pageSource).toContain('void focusSection(route.query.section)');
  });

  it('通过我的页面和 overlay 路由进入偏好设定二级页', () => {
    expect(routeNamesSource).toContain("preferenceSettings: 'preference-settings'");
    expect(routerSource).toContain('name: ROUTES.preferenceSettings');
    expect(routerSource).toContain(
      "component: () => import('@/pages/profile/PreferenceSettingsPage.vue')",
    );
    expect(routerSource).toContain("meta: { overlay: true, title: '偏好设定' }");
    expect(profilePageSource).toContain('@click="goPreferenceSettings"');
    expect(profilePageSource).toContain('name: ROUTES.preferenceSettings');
    expect(profilePageSource).toContain('<strong>偏好设定</strong>');
    expect(profilePageSource).toContain('<small>管理长期风格与颜色偏好</small>');
  });
});

describe('PreferenceSettingsPage 保存接线', () => {
  it('无修改时禁用保存，保存期间显示“保存中”并继续禁用', () => {
    expect(pageSource).toContain('const saving = ref(false)');
    expect(pageSource).toContain('const isDirty = computed');
    expect(pageSource).toContain('const canSave = computed');
    expect(pageSource).toContain(':disabled="!canSave"');
    expect(pageSource).toContain("{{ saving ? '保存中' : '保存' }}");
  });

  it('从本地草稿构造完整候选 Profile，并等待 Store 原子保存', () => {
    expect(pageSource).toContain('const nextProfile: ProfileState = createPreferenceCandidate(');
    expect(pageSource).toContain('profileStore.profile');
    expect(pageSource).toContain('currentDraft()');
    expect(pageSource).toContain('const saved = await profileStore.saveProfile(nextProfile)');
    expect(pageSource).not.toContain('profileStore.profile.styles =');
    expect(pageSource).not.toContain('profileStore.profile.colors =');
    expect(pageSource).not.toContain('Object.assign(profileStore.profile');
  });

  it('PUT 成功后才用 Store 的服务端确认响应刷新草稿和初始快照', () => {
    expect(pageSource).toMatch(
      /const saved = await profileStore\.saveProfile\(nextProfile\);[\s\S]*if \(!saved\) \{[\s\S]*return false;[\s\S]*\}[\s\S]*resetDraft\(createPreferenceDraft\(profileStore\.profile\)\)/,
    );
    expect(pageSource).toContain("notify.success('偏好已保存')");
  });

  it('PUT 失败时提示错误并在刷新草稿之前返回，让当前草稿保持原样', () => {
    expect(pageSource).toMatch(
      /if \(!saved\) \{[\s\S]*notify\.error\(profileStore\.error \?\? '偏好保存失败，请稍后重试'\);[\s\S]*return false;[\s\S]*\}[\s\S]*resetDraft\(createPreferenceDraft\(profileStore\.profile\)\)/,
    );
  });
});

describe('PreferenceSettingsPage 未保存离页确认', () => {
  it('返回按钮与路由守卫复用 Decision Dialog 的三个业务动作', () => {
    expect(pageSource).toContain('<PageHeader title="偏好设定" back @back="requestBack">');
    expect(pageSource).toContain("from '@/stores/decisionDialog'");
    expect(pageSource).toContain("type LeaveChoice = 'stay' | 'discard' | 'save'");
    expect(pageSource).toContain('decisionDialog.choose<LeaveChoice>');
    expect(pageSource).toContain("{ value: 'stay', label: '继续编辑'");
    expect(pageSource).toContain("{ value: 'discard', label: '放弃修改'");
    expect(pageSource).toContain("value: 'save'");
    expect(pageSource).toContain("label: '保存并离开'");
    expect(pageSource).toContain('onBeforeRouteLeave(async () => {');
  });

  it('继续编辑或保存失败时阻止离开，放弃修改时恢复初始快照', () => {
    expect(pageSource).toMatch(
      /async function requestBack\(\)[\s\S]*if \(choice === 'stay'\) return;[\s\S]*if \(choice === 'save' && !\(await saveDraft\(\)\)\) return;[\s\S]*if \(choice === 'discard'\) resetDraft\(initialSnapshot\.value\);[\s\S]*router\.back\(\)/,
    );
    expect(pageSource).toMatch(
      /onBeforeRouteLeave\(async \(\) => \{[\s\S]*if \(choice === 'stay'\) return false;[\s\S]*if \(choice === 'save'\) return await saveDraft\(\);[\s\S]*resetDraft\(initialSnapshot\.value\);[\s\S]*return true;/,
    );
  });
});

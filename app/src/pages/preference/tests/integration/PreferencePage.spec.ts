/**
 * 测试类型：集成测试。
 * 测试对象/范围：PreferencePage 对最新 Profile 偏好草稿和 metadata 风格/颜色选项的页面接线。
 * 隔离内容：不挂载 Vue、不创建 Pinia、不启动 MSW、不连接真实 Backend；只检查 SFC 集成边界。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('../../PreferencePage.vue', import.meta.url), 'utf8');

describe('PreferencePage 偏好回显', () => {
  it('读取最新 Profile 后把已有风格和颜色复制到页面本地草稿', () => {
    expect(pageSource).toContain("import { useEnums } from '@/composables/useEnums'");
    expect(pageSource).toContain("import { useProfileStore } from '@/stores/profile'");
    expect(pageSource).toContain('const styleDraft = ref<string[]>([]);');
    expect(pageSource).toContain('const colorDraft = ref<string[]>([]);');
    expect(pageSource).toMatch(
      /await Promise\.all\(\[enums\.ensureLoaded\(\), profileStore\.fetchProfile\(\)\]\)/,
    );
    expect(pageSource).toContain('styleDraft.value = [...profileStore.profile.styles]');
    expect(pageSource).toContain('colorDraft.value = [...profileStore.profile.colors]');
  });

  it('遍历 metadata 的全部风格和颜色，并用中文标签展示、value 保存选择', () => {
    expect(pageSource).toContain("const styleOptions = computed(() => enums.get('style_tag'))");
    expect(pageSource).toContain("const colorOptions = computed(() => enums.get('color'))");
    expect(pageSource).toContain('v-for="option in styleOptions"');
    expect(pageSource).toContain('v-for="option in colorOptions"');
    expect(pageSource).toContain('styleDraft.includes(option.value)');
    expect(pageSource).toContain('colorDraft.includes(option.value)');
    expect(pageSource).toContain('{{ option.label_zh }}');
  });
});

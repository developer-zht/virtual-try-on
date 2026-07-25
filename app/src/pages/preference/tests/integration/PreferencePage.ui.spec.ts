/**
 * 测试类型：UI 集成边界测试。
 * 测试对象/范围：PreferencePage 的只读偏好摘要、收藏标题行和既有收藏功能。
 * 隔离内容：不挂载 Vue、不创建 Pinia、不启动 Router、不连接真实 Backend；只检查提案 SFC 的页面接线。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(new URL('../../PreferencePage.vue', import.meta.url), 'utf8');

describe('PreferencePage 两页 UI 提案', () => {
  it('使用纵向颜色渐变，并直接展示最多三个风格和场合标签', () => {
    expect(pageSource).toContain('linear-gradient(180deg');
    expect(pageSource).toContain('const styleSummary = computed');
    expect(pageSource).toContain('const occasionSummary = computed');
    expect(pageSource).toContain('.slice(0, 3)');
    expect(pageSource).toContain('v-for="style in styleSummary"');
    expect(pageSource).toContain('v-for="occasion in occasionSummary"');
    expect(pageSource).not.toContain('stat-small__num');
  });

  it('把收藏总数放在我的收藏标题行最右侧，并保留现有收藏功能', () => {
    expect(pageSource).toContain('<h2 class="section-title">我的收藏</h2>');
    expect(pageSource).toContain('{{ savedCount }} 套');
    expect(pageSource).not.toContain('最近收藏');
    expect(pageSource).toContain('class="saved-empty"');
    expect(pageSource).toContain('class="saved-card"');
    expect(pageSource).toContain('async function onDelete(id: string)');
  });

  it('三张摘要卡进入同一个偏好设定二级页的对应区域', () => {
    expect(pageSource).toContain('@click="goPreferenceSettings(\'colors\')"');
    expect(pageSource).toContain('@click="goPreferenceSettings(\'styles\')"');
    expect(pageSource).toContain('@click="goPreferenceSettings(\'occasions\')"');
    expect(pageSource).toContain('name: ROUTES.preferenceSettings');
    expect(pageSource).toContain('query: { section }');
  });

  it('只有登录用户才读取 Profile 和 metadata，收藏仍由独立 Store 管理', () => {
    expect(pageSource).toContain("import { useProfileStore } from '@/stores/profile'");
    expect(pageSource).toContain("import { useSavedOutfitsStore } from '@/stores/savedOutfits'");
    expect(pageSource).toContain('if (auth.loggedIn)');
    expect(pageSource).toContain(
      'await Promise.all([enums.ensureLoaded(), profileStore.fetchProfile()])',
    );
    expect(pageSource).toContain('void fetchSaved()');
  });
});

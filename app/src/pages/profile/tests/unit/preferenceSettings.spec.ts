/**
 * 测试类型：单元测试。
 * 测试对象/范围：偏好设定二级页的本地草稿、无序集合 dirty 判断和完整候选 Profile 构造。
 * 隔离内容：不挂载 Vue、不创建 Pinia、不启动 Router、不连接真实 Backend。
 */
import { describe, expect, it } from 'vitest';
import type { ProfileState } from '../../../../stores/types/profile';
import {
  createPreferenceCandidate,
  createPreferenceDraft,
  isPreferenceDraftDirty,
} from '../../preferenceSettings';

function profile(overrides: Partial<ProfileState> = {}): ProfileState {
  return {
    height: 168,
    weight: 52,
    gender: 'female',
    skinTone: 'medium',
    bodyType: 'hourglass',
    ageRange: '26_35',
    hairStyle: 'long',
    hairColor: 'black',
    shoulderWidth: 38,
    waist: 66,
    hip: 91,
    thigh: 52,
    calf: 34,
    legLength: 96,
    footLength: 235,
    styles: ['Minimalist', 'Sporty'],
    colors: ['Black', 'White'],
    genModel: 'model-a',
    vlModel: 'model-b',
    ...overrides,
  };
}

describe('偏好本地草稿', () => {
  it('从服务端已确认 Profile 克隆风格与颜色，页面修改不会反向修改 Store 数组', () => {
    const confirmed = profile();

    const draft = createPreferenceDraft(confirmed);
    draft.styles.push('Vintage');
    draft.colors.length = 0;

    expect(confirmed.styles).toEqual(['Minimalist', 'Sporty']);
    expect(confirmed.colors).toEqual(['Black', 'White']);
  });

  it('风格或颜色只有顺序变化时不视为未保存修改', () => {
    const initial = {
      styles: ['Minimalist', 'Sporty'],
      colors: ['Black', 'White'],
    };

    expect(
      isPreferenceDraftDirty(
        {
          styles: ['Sporty', 'Minimalist'],
          colors: ['White', 'Black'],
        },
        initial,
      ),
    ).toBe(false);
  });

  it('选择集合内容变化时视为未保存修改', () => {
    expect(
      isPreferenceDraftDirty(
        { styles: ['Vintage'], colors: ['Black'] },
        { styles: ['Minimalist'], colors: ['Black'] },
      ),
    ).toBe(true);
  });
});

describe('完整候选 Profile', () => {
  it('保留非偏好字段，并使用草稿数组创建与 Store 隔离的完整候选值', () => {
    const confirmed = profile();
    const draft = {
      styles: ['Elegant'],
      colors: ['Blue', 'Gray'],
    };

    const nextProfile = createPreferenceCandidate(confirmed, draft);
    draft.styles.push('Streetwear');
    draft.colors.length = 0;

    expect(nextProfile).toEqual({
      ...confirmed,
      styles: ['Elegant'],
      colors: ['Blue', 'Gray'],
    });
    expect(nextProfile.styles).not.toBe(confirmed.styles);
    expect(nextProfile.colors).not.toBe(confirmed.colors);
  });

  it('保留空数组，让 PUT 可以清空风格与颜色偏好', () => {
    const nextProfile = createPreferenceCandidate(profile(), {
      styles: [],
      colors: [],
    });

    expect(nextProfile.styles).toEqual([]);
    expect(nextProfile.colors).toEqual([]);
  });
});

/**
 * 测试类型：单元测试。
 * 测试对象/范围：Profile Store 的初始状态、Profile 读取、metadata 枚举分组和候选 Profile 原子保存。
 * 隔离内容：不启动 MSW、不连接真实 Backend、不渲染 Vue 页面；仅 mock Profile 与 metadata API。
 * 修改原因：保存请求完成前，Store 只能保留服务器已确认的数据，不能先发布页面候选值再失败回滚。
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../../api/types/profile';

const apiMocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getEnums: vi.fn(),
}));

vi.mock('@/api/profile', () => ({
  getProfile: apiMocks.getProfile,
  updateProfile: apiMocks.updateProfile,
}));

vi.mock('@/api/metadata', () => ({
  getEnums: apiMocks.getEnums,
}));

import { useProfileStore } from '../../profile';

const profileResponse: Profile = {
  body: {
    height_cm: 175,
    weight_kg: 52,
    shoulder_width_cm: 38,
    waist_cm: 66,
    hip_cm: 90,
    thigh_cm: 50,
    calf_cm: 34,
    leg_length_cm: 82,
    body_type: '标准',
    body_type_en: 'standard',
    gender: '女',
    gender_en: 'female',
    skin_tone: '自然',
    skin_tone_en: 'medium',
    age_range: '26–35',
    age_range_en: '26_35',
    hair_style: '长发',
    hair_style_en: 'long',
    hair_color: '黑色',
    hair_color_en: 'black',
    sizes: {
      tops_cn: 'M',
      bottoms_waist_cn: '27',
      bottoms_length_cn: '165',
      shoes_cn: '37',
      shoes_foot_length_mm: 235,
    },
  },
  preferences: {
    style_tags: ['简约'],
    style_tags_en: ['minimalist'],
    color_preferences: ['黑'],
    color_preferences_en: ['Black'],
  },
  completed: true,
  updated_at: '2026-07-20T08:00:00Z',
};

const enumItem = (value: string) => ({ value, label_zh: value, label_en: value });

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('Profile Store 初始状态', () => {
  it('为新增外观字段提供明确的 null 初始值', () => {
    const store = useProfileStore();

    expect(store.profile).toMatchObject({
      gender: null,
      ageRange: null,
      hairStyle: null,
      hairColor: null,
    });
  });
});

describe('fetchProfile', () => {
  it('通过统一映射回显完整 Profile 字段', async () => {
    apiMocks.getProfile.mockResolvedValue(structuredClone(profileResponse));
    const store = useProfileStore();

    await store.fetchProfile();

    expect(store.profile).toMatchObject({
      height: 175,
      weight: 52,
      gender: 'female',
      skinTone: 'medium',
      bodyType: 'standard',
      ageRange: '26_35',
      hairStyle: 'long',
      hairColor: 'black',
      shoulderWidth: 38,
      waist: 66,
      hip: 90,
      thigh: 50,
      calf: 34,
      legLength: 82,
      footLength: 235,
    });
  });
});

describe('fetchOptions', () => {
  it('把 Profile 页面需要的八组 metadata 枚举全部写入 options', async () => {
    apiMocks.getEnums.mockResolvedValue({
      types: {
        body_shape: [enumItem('standard')],
        gender: [enumItem('female')],
        skin_tone: [enumItem('medium')],
        age_range: [enumItem('26_35')],
        hair_style: [enumItem('long')],
        hair_color: [enumItem('black')],
        style_tag: [enumItem('minimalist')],
        color: [enumItem('Black')],
      },
      loaded_at: '2026-07-20T08:00:00Z',
    });
    const store = useProfileStore();

    await store.fetchOptions();

    expect(store.options).toEqual({
      bodyTypes: [enumItem('standard')],
      genders: [enumItem('female')],
      skinTones: [enumItem('medium')],
      ageRanges: [enumItem('26_35')],
      hairStyles: [enumItem('long')],
      hairColors: [enumItem('black')],
      styleTags: [enumItem('minimalist')],
      colors: [enumItem('Black')],
    });
  });
});

describe('saveProfile', () => {
  it('使用候选 Profile 生成 PUT，并在服务器响应前保持 Store 已确认值', async () => {
    apiMocks.getProfile.mockResolvedValue(structuredClone(profileResponse));
    let finishUpdate: ((response: Profile) => void) | undefined;
    apiMocks.updateProfile.mockImplementation(
      () =>
        new Promise<Profile>((resolve) => {
          finishUpdate = resolve;
        }),
    );
    const store = useProfileStore();
    await store.fetchProfile();
    const next = {
      ...store.profile,
      height: 180,
      styles: [...store.profile.styles],
    };

    const saving = store.saveProfile(next);

    expect(apiMocks.updateProfile).toHaveBeenCalledWith({ height_cm: 180 });
    expect(store.profile.height).toBe(175);

    const updatedResponse = structuredClone(profileResponse);
    updatedResponse.body.height_cm = 180;
    finishUpdate?.(updatedResponse);

    await expect(saving).resolves.toBe(true);
    expect(store.profile.height).toBe(180);
  });

  it('只把相对读取快照发生变化的 Profile 字段发送给 API', async () => {
    apiMocks.getProfile.mockResolvedValue(structuredClone(profileResponse));
    const updatedResponse = structuredClone(profileResponse);
    updatedResponse.body.gender = '男';
    updatedResponse.body.gender_en = 'male';
    updatedResponse.body.waist_cm = 67;
    updatedResponse.body.hair_color = '棕色';
    updatedResponse.body.hair_color_en = 'brown';
    apiMocks.updateProfile.mockResolvedValue(updatedResponse);
    const store = useProfileStore();
    await store.fetchProfile();
    const next = {
      ...store.profile,
      gender: 'male',
      waist: 67,
      hairColor: 'brown',
      styles: [...store.profile.styles],
    };

    const saved = await store.saveProfile(next);

    expect(saved).toBe(true);
    expect(apiMocks.updateProfile).toHaveBeenCalledWith({
      gender_en: 'male',
      waist_cm: 67,
      hair_color_en: 'brown',
    });
    expect(store.profile).toMatchObject({ gender: 'male', waist: 67, hairColor: 'brown' });
  });

  it('保存成功刷新快照后，无新变化时不重复发送 PUT', async () => {
    apiMocks.getProfile.mockResolvedValue(structuredClone(profileResponse));
    apiMocks.updateProfile.mockResolvedValue(structuredClone(profileResponse));
    const store = useProfileStore();
    await store.fetchProfile();

    const saved = await store.saveProfile({
      ...store.profile,
      styles: [...store.profile.styles],
    });

    expect(saved).toBe(true);
    expect(apiMocks.updateProfile).not.toHaveBeenCalled();
  });

  it('PUT 失败时返回 false，并且不把候选 Profile 写入 Store', async () => {
    apiMocks.getProfile.mockResolvedValue(structuredClone(profileResponse));
    apiMocks.updateProfile.mockResolvedValue(null);
    const store = useProfileStore();
    await store.fetchProfile();
    const next = {
      ...store.profile,
      height: 180,
      styles: [...store.profile.styles],
    };

    const saved = await store.saveProfile(next);

    expect(saved).toBe(false);
    expect(apiMocks.updateProfile).toHaveBeenCalledWith({ height_cm: 180 });
    expect(store.profile.height).toBe(175);
  });
});

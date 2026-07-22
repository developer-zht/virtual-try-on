/**
 * 测试类型：单元测试。
 * 测试对象/范围：Profile API 嵌套响应与 Profile Store 扁平状态之间的纯字段映射。
 * 隔离内容：不创建 Pinia、不启动 MSW、不发送网络请求、不渲染 Vue 页面。
 * 修改原因：先用完整 v1.8.1 响应锁住读取回显，防止新增外观字段在 Store 中丢失。
 */
import { describe, expect, it } from 'vitest';
import { profileFromApi, profileToPatch } from '../../profileMapping';
import type { ProfileState } from '../../types/profile';

function completeState(overrides: Partial<ProfileState> = {}): ProfileState {
  return {
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
    styles: ['minimalist'],
    color: 'Black',
    genModel: null,
    vlModel: null,
    ...overrides,
  };
}

describe('profileFromApi', () => {
  it('把完整 v1.8.1 Profile 响应映射为 UI 使用的扁平状态', () => {
    const state = profileFromApi({
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
    });

    expect(state).toEqual({
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
      styles: ['minimalist'],
      color: 'Black',
      genModel: null,
      vlModel: null,
    });
  });
});

// CODEX-PHASE-5：保存映射只比较可持久化字段，并把 camelCase 变化翻译成扁平 snake_case patch。
// 原因：PUT 是三态部分更新，不能每次保存都覆盖未修改的服务端数据。
describe('profileToPatch', () => {
  it('只发送相对初始快照发生变化的字段', () => {
    const initial = completeState();
    const current = completeState({
      height: 176,
      gender: 'male',
      skinTone: 'fair',
      ageRange: '36_45',
      hairStyle: 'short',
      hairColor: 'brown',
      shoulderWidth: 39,
      footLength: 240,
    });

    expect(profileToPatch(current, initial)).toEqual({
      height_cm: 176,
      gender_en: 'male',
      skin_tone_en: 'fair',
      age_range_en: '36_45',
      hair_style_en: 'short',
      hair_color_en: 'brown',
      shoulder_width_cm: 39,
      size_shoes_foot_length_mm: 240,
    });
  });

  it('用 null 清空可选字段，并用空数组清空风格偏好', () => {
    const initial = completeState();
    const current = completeState({
      bodyType: null,
      ageRange: null,
      waist: null,
      footLength: null,
      styles: [],
      color: null,
    });

    expect(profileToPatch(current, initial)).toEqual({
      body_type_en: null,
      age_range_en: null,
      waist_cm: null,
      size_shoes_foot_length_mm: null,
      style_tags_en: [],
      color_preferences_en: null,
    });
  });

  it('没有变化时返回空 patch，且不持久化仅供前端使用的模型字段', () => {
    const initial = completeState();
    const current = completeState({ genModel: 'local-gen', vlModel: 'local-vl' });

    expect(profileToPatch(current, initial)).toEqual({});
  });
});

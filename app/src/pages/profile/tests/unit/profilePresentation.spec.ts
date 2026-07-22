/**
 * 测试类型：单元测试。
 * 测试对象/范围：Profile 页面用户名、metadata 枚举适配、身体资料三态和摘要显示纯函数。
 * 隔离内容：不创建 Vue 组件、不创建 Pinia、不发送网络请求。
 * 修改原因：确保页面展示复用身体数据领域规则，不再维护另一套完整性与合法性判断。
 */
import { describe, expect, it } from 'vitest';
import type { EnumItem } from '@/api/types/metadata';
import type {
  BodyDataDraft,
  BodyDataEnumCatalog,
  ProfileBodySource,
} from '@/utils/profile/types/bodyData';
import * as presentationModule from '../../profilePresentation';

type PresentationSubject = typeof presentationModule & {
  bodyDataEnumCatalogFromTypes(types: Record<string, EnumItem[]>): BodyDataEnumCatalog;
  bodyDataPresentationState(
    draft: BodyDataDraft,
    catalog?: BodyDataEnumCatalog,
  ): 'incomplete' | 'invalid' | 'ready';
};

const presentation = presentationModule;

function completeBody(overrides: Partial<ProfileBodySource> = {}): ProfileBodySource {
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
    ...overrides,
  };
}

function completeDraft(overrides: Partial<BodyDataDraft> = {}): BodyDataDraft {
  return { ...completeBody(), ...overrides };
}

const enumTypes: Record<string, EnumItem[]> = {
  gender: [{ value: 'female', label_zh: '女', label_en: 'Female' }],
  skin_tone: [{ value: 'medium', label_zh: '自然', label_en: 'Medium' }],
  body_shape: [{ value: 'standard', label_zh: '标准', label_en: 'Standard' }],
  age_range: [{ value: '26_35', label_zh: '26–35', label_en: '26–35' }],
  hair_style: [{ value: 'long', label_zh: '长发', label_en: 'Long' }],
  hair_color: [{ value: 'black', label_zh: '黑色', label_en: 'Black' }],
};

describe('profileDisplayName', () => {
  it('按昵称、邮箱和默认文案顺序回退', () => {
    expect(presentation.profileDisplayName({ nickname: ' Luna ', email: 'a@example.com' })).toBe(
      'Luna',
    );
    expect(presentation.profileDisplayName({ nickname: ' ', email: 'a@example.com' })).toBe(
      'a@example.com',
    );
    expect(presentation.profileDisplayName(null)).toBe('我的账户');
  });
});

describe('bodyDataEnumCatalogFromTypes', () => {
  it('把后端 snake_case metadata 分组转换成身体数据领域字段', () => {
    expect(presentation.bodyDataEnumCatalogFromTypes(enumTypes)).toEqual({
      gender: ['female'],
      skinTone: ['medium'],
      bodyType: ['standard'],
      ageRange: ['26_35'],
      hairStyle: ['long'],
      hairColor: ['black'],
    });
  });
});

describe('bodyDataPresentationState', () => {
  const catalog: BodyDataEnumCatalog = {
    gender: ['female'],
    skinTone: ['medium'],
    bodyType: ['standard'],
    ageRange: ['26_35'],
    hairStyle: ['long'],
    hairColor: ['black'],
  };

  it('依次区分必须字段缺失、数据非法和可用于模特的状态', () => {
    expect(presentation.bodyDataPresentationState(completeDraft({ gender: null }), catalog)).toBe(
      'incomplete',
    );
    expect(presentation.bodyDataPresentationState(completeDraft({ height: 999 }), catalog)).toBe(
      'invalid',
    );
    expect(presentation.bodyDataPresentationState(completeDraft(), catalog)).toBe('ready');
  });
});

describe('bodyDataSummary', () => {
  it('必须字段不完整时不显示误导性的完成摘要', () => {
    expect(presentation.bodyDataSummary(completeBody({ skinTone: null }))).toBe('尚未完成必须资料');
  });

  it('完整时使用传入的体型中文标签', () => {
    expect(presentation.bodyDataSummary(completeBody(), '标准')).toBe('175 cm · 52 kg · 标准');
  });
});

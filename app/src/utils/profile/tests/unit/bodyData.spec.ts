/**
 * 测试类型：单元测试
 * 测试对象：身体数据的草稿创建、标准化、完整性、合法性、模特就绪和修改判断。
 * 隔离内容：不创建 Vue 组件、不创建 Pinia、不发送网络请求。
 */
import { describe, expect, it } from 'vitest';
import {
  createBodyDataDraft,
  isBodyDataDirty,
  isBodyDataReadyForModel,
  isRequiredBodyDataComplete,
  normalizeBodyDataDraft,
  validateBodyDataDraft,
} from '../../bodyData';
import type { BodyDataDraft, BodyDataEnumCatalog, ProfileBodySource } from '../../types/bodyData';

const enumCatalog: BodyDataEnumCatalog = {
  gender: ['female', 'male'],
  skinTone: ['fair', 'medium', 'dark'],
  bodyType: ['slim', 'standard', 'athletic'],
  ageRange: ['18_25', '26_35', '36_45', '46_plus'],
  hairStyle: ['short', 'long'],
  hairColor: ['black', 'brown'],
};

function completeDraft(overrides: Partial<BodyDataDraft> = {}): BodyDataDraft {
  return {
    height: 165,
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

describe('createBodyDataDraft', () => {
  it('从 Profile 字段创建一份完整且独立的编辑草稿', () => {
    const source: ProfileBodySource = {
      height: 165,
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
    };

    const draft = createBodyDataDraft(source);

    expect(draft).toEqual(source);
    expect(draft).not.toBe(source);
  });
});

describe('normalizeBodyDataDraft', () => {
  it('转换数字字符串、清理空白，并将空输入统一为 null', () => {
    const normalized = normalizeBodyDataDraft(
      completeDraft({
        height: ' 165 ',
        weight: '52.5',
        gender: ' female ',
        ageRange: '   ',
        shoulderWidth: '',
        waist: ' 66.5 ',
      }),
    );

    expect(normalized.height).toBe(165);
    expect(normalized.weight).toBe(52.5);
    expect(normalized.gender).toBe('female');
    expect(normalized.ageRange).toBeNull();
    expect(normalized.shoulderWidth).toBeNull();
    expect(normalized.waist).toBe(66.5);
  });

  it('保留无法转换的非空数字文本，以便合法性检查给出错误', () => {
    const normalized = normalizeBodyDataDraft(completeDraft({ waist: 'not-a-number' }));

    expect(normalized.waist).toBe('not-a-number');
  });
});

describe('isRequiredBodyDataComplete', () => {
  it('五个必须字段都有非空输入时返回 true', () => {
    expect(isRequiredBodyDataComplete(completeDraft())).toBe(true);
  });

  it.each([
    ['height', ''],
    ['weight', null],
    ['gender', '   '],
    ['skinTone', null],
    ['bodyType', ''],
  ] as const)('%s 缺失时返回 false', (field, value) => {
    expect(isRequiredBodyDataComplete(completeDraft({ [field]: value }))).toBe(false);
  });

  it('有输入但格式错误时仍属于完整，合法性由另一个函数判断', () => {
    expect(isRequiredBodyDataComplete(completeDraft({ height: 'abc' }))).toBe(true);
  });
});

describe('validateBodyDataDraft', () => {
  it('复用已有身高和体重范围', () => {
    const errors = validateBodyDataDraft(completeDraft({ height: 49, weight: 301 }), enumCatalog);

    expect(errors.height?.code).toBe('HEIGHT_OUT_OF_RANGE');
    expect(errors.weight?.code).toBe('WEIGHT_OUT_OF_RANGE');
  });

  it('把无法转换的必须数字报告为数字错误', () => {
    const errors = validateBodyDataDraft(
      completeDraft({ height: 'abc', weight: 'unknown' }),
      enumCatalog,
    );

    expect(errors.height?.code).toBe('BODY_DATA_NUMBER_INVALID');
    expect(errors.weight?.code).toBe('BODY_DATA_NUMBER_INVALID');
  });

  it('允许可选数值留空或使用正数', () => {
    const errors = validateBodyDataDraft(
      completeDraft({ shoulderWidth: '', hip: null, waist: '66.5' }),
      enumCatalog,
    );

    expect(errors.shoulderWidth).toBeUndefined();
    expect(errors.hip).toBeUndefined();
    expect(errors.waist).toBeUndefined();
  });

  it('拒绝非数字、零和负数的可选测量值', () => {
    const errors = validateBodyDataDraft(
      completeDraft({ shoulderWidth: 'wide', waist: 0, footLength: -1 }),
      enumCatalog,
    );

    expect(errors.shoulderWidth?.code).toBe('BODY_DATA_NUMBER_INVALID');
    expect(errors.waist?.code).toBe('BODY_DATA_NUMBER_NOT_POSITIVE');
    expect(errors.footLength?.code).toBe('BODY_DATA_NUMBER_NOT_POSITIVE');
  });

  it('拒绝不在已加载 metadata 中的必须和可选枚举值', () => {
    const errors = validateBodyDataDraft(
      completeDraft({ gender: 'unknown', hairColor: 'blue' }),
      enumCatalog,
    );

    expect(errors.gender?.code).toBe('BODY_DATA_ENUM_INVALID');
    expect(errors.hairColor?.code).toBe('BODY_DATA_ENUM_INVALID');
  });

  it('metadata 尚未加载时不擅自判定已有枚举值非法', () => {
    const errors = validateBodyDataDraft(completeDraft({ gender: 'legacy-value' }));

    expect(errors.gender).toBeUndefined();
  });
});

describe('isBodyDataReadyForModel', () => {
  it('只有完整且合法时才允许创建专属模特', () => {
    expect(isBodyDataReadyForModel(completeDraft(), enumCatalog)).toBe(true);
    expect(isBodyDataReadyForModel(completeDraft({ gender: null }), enumCatalog)).toBe(false);
    expect(isBodyDataReadyForModel(completeDraft({ height: 999 }), enumCatalog)).toBe(false);
    expect(isBodyDataReadyForModel(completeDraft({ hairStyle: 'unknown' }), enumCatalog)).toBe(
      false,
    );
  });
});

describe('isBodyDataDirty', () => {
  it('忽略只改变表示方式但没有改变语义的输入', () => {
    const initial = completeDraft();
    const current = completeDraft({ height: '165', gender: ' female ' });

    expect(isBodyDataDirty(current, initial)).toBe(false);
  });

  it('任意必须或可选字段的有效变化都返回 true', () => {
    const initial = completeDraft();

    expect(isBodyDataDirty(completeDraft({ weight: 53 }), initial)).toBe(true);
    expect(isBodyDataDirty(completeDraft({ hairStyle: 'short' }), initial)).toBe(true);
    expect(isBodyDataDirty(completeDraft({ waist: 67 }), initial)).toBe(true);
  });
});

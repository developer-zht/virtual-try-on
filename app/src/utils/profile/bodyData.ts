import type { FieldError } from '../types/validators';
import { validateHeight, validateWeight } from '../validators';
import type {
  BodyDataDraft,
  BodyDataEnumCatalog,
  BodyDataValidationErrors,
  EnumField,
  NumericDraftValue,
  OptionalNumberField,
  ProfileBodySource,
} from './types/bodyData';

const OPTIONAL_NUMBER_LABELS: Record<OptionalNumberField, string> = {
  shoulderWidth: '肩宽',
  waist: '腰围',
  hip: '臀围',
  thigh: '大腿围',
  calf: '小腿围',
  legLength: '腿长',
  footLength: '脚长',
};

const ENUM_LABELS: Record<EnumField, string> = {
  gender: '性别',
  skinTone: '肤色',
  bodyType: '体型',
  ageRange: '年龄段',
  hairStyle: '发型',
  hairColor: '发色',
};

export function createBodyDataDraft(source: ProfileBodySource): BodyDataDraft {
  return { ...source };
}

function normalizeNumber(value: NumericDraftValue): NumericDraftValue {
  if (value === null) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const number = Number(trimmed);
  return Number.isFinite(number) ? number : trimmed;
}

function normalizeText(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

// CODEX-PHASE-5：完整性、合法性和修改判断都基于同一份标准化结果。
// 原因：`"165"`、`165` 和带空格文本在业务上不应该产生不同结论。
export function normalizeBodyDataDraft(draft: BodyDataDraft): BodyDataDraft {
  return {
    height: normalizeNumber(draft.height),
    weight: normalizeNumber(draft.weight),
    gender: normalizeText(draft.gender),
    skinTone: normalizeText(draft.skinTone),
    bodyType: normalizeText(draft.bodyType),
    ageRange: normalizeText(draft.ageRange),
    hairStyle: normalizeText(draft.hairStyle),
    hairColor: normalizeText(draft.hairColor),
    shoulderWidth: normalizeNumber(draft.shoulderWidth),
    waist: normalizeNumber(draft.waist),
    hip: normalizeNumber(draft.hip),
    thigh: normalizeNumber(draft.thigh),
    calf: normalizeNumber(draft.calf),
    legLength: normalizeNumber(draft.legLength),
    footLength: normalizeNumber(draft.footLength),
  };
}

// CODEX-PHASE-5：完整只回答五个必须字段是否有输入，不混入合法性。
// 原因：页面需要区分“待填写”和“已填写但待修正”。
export function isRequiredBodyDataComplete(draft: BodyDataDraft): boolean {
  const normalized = normalizeBodyDataDraft(draft);

  return (
    normalized.height !== null &&
    normalized.weight !== null &&
    normalized.gender !== null &&
    normalized.skinTone !== null &&
    normalized.bodyType !== null
  );
}

function invalidNumber(label: string): FieldError {
  return {
    code: 'BODY_DATA_NUMBER_INVALID',
    message: `${label}需为数字`,
  };
}

function notPositiveNumber(label: string): FieldError {
  return {
    code: 'BODY_DATA_NUMBER_NOT_POSITIVE',
    message: `${label}需大于 0`,
  };
}

function invalidEnum(label: string): FieldError {
  return {
    code: 'BODY_DATA_ENUM_INVALID',
    message: `${label}选项已失效，请重新选择`,
  };
}

function validateRequiredNumber(
  value: NumericDraftValue,
  label: string,
  validator: (number: number | null) => FieldError | null,
): FieldError | null {
  if (value === null) return null;
  if (typeof value !== 'number') return invalidNumber(label);
  return validator(value);
}

// CODEX-PHASE-5：合法性返回字段级错误，不把缺失的必须字段伪装成格式错误。
// 原因：缺失由完整性处理；错误映射供输入框和页面状态展示具体原因。
export function validateBodyDataDraft(
  draft: BodyDataDraft,
  enumCatalog: BodyDataEnumCatalog = {},
): BodyDataValidationErrors {
  const normalized = normalizeBodyDataDraft(draft);
  const errors: BodyDataValidationErrors = {};

  const heightError = validateRequiredNumber(normalized.height, '身高', validateHeight);
  if (heightError) errors.height = heightError;

  const weightError = validateRequiredNumber(normalized.weight, '体重', validateWeight);
  if (weightError) errors.weight = weightError;

  for (const field of Object.keys(OPTIONAL_NUMBER_LABELS) as OptionalNumberField[]) {
    const value = normalized[field];
    if (value === null) continue;

    if (typeof value !== 'number') {
      errors[field] = invalidNumber(OPTIONAL_NUMBER_LABELS[field]);
    } else if (value <= 0) {
      errors[field] = notPositiveNumber(OPTIONAL_NUMBER_LABELS[field]);
    }
  }

  for (const field of Object.keys(ENUM_LABELS) as EnumField[]) {
    const value = normalized[field];
    const allowedValues = enumCatalog[field];

    // metadata 尚未返回时不猜测合法集合；页面单独维持枚举加载状态。
    if (value !== null && allowedValues !== undefined && !allowedValues.includes(value)) {
      errors[field] = invalidEnum(ENUM_LABELS[field]);
    }
  }

  return errors;
}

// CODEX-PHASE-5：模特就绪必须同时满足产品完整度和客户端合法性。
// 原因：后端 `profile_completed` 只检查身高和体重，不能作为 Try-on 前置条件。
export function isBodyDataReadyForModel(
  draft: BodyDataDraft,
  enumCatalog: BodyDataEnumCatalog = {},
): boolean {
  return (
    isRequiredBodyDataComplete(draft) &&
    Object.keys(validateBodyDataDraft(draft, enumCatalog)).length === 0
  );
}

// CODEX-PHASE-5：修改判断比较标准化快照，而不是输入框的原始表示。
// 原因：只改变空格或把数字 165 写成字符串 `"165"` 不应触发重新生成模特。
export function isBodyDataDirty(current: BodyDataDraft, initial: BodyDataDraft): boolean {
  return (
    JSON.stringify(normalizeBodyDataDraft(current)) !==
    JSON.stringify(normalizeBodyDataDraft(initial))
  );
}

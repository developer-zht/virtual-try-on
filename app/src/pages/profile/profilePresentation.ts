/**
 * Profile 页面组只保留显示规则和 metadata 字段适配。
 * 原因：草稿、标准化、完整性和合法性必须统一复用 utils/profile/bodyData，避免页面维护第二套业务规则。
 */
import type { EnumItem } from '@/api/types/metadata';
import {
  createBodyDataDraft,
  isRequiredBodyDataComplete,
  validateBodyDataDraft,
} from '@/utils/profile/bodyData';
import type {
  BodyDataDraft,
  BodyDataEnumCatalog,
  ProfileBodySource,
} from '@/utils/profile/types/bodyData';

export interface SessionIdentity {
  nickname?: string | null;
  email?: string | null;
}

export type BodyDataPresentationState = 'incomplete' | 'invalid' | 'ready';

export function profileDisplayName(user: SessionIdentity | null | undefined): string {
  return user?.nickname?.trim() || user?.email?.trim() || '我的账户';
}

// 把 API metadata 的 snake_case type 转成身体数据领域使用的 camelCase 字段。
// 原因：两个页面必须共享同一份动态枚举目录，同时 metadata 缺少某组时不能擅自声明空集合为合法全集。
export function bodyDataEnumCatalogFromTypes(
  types: Record<string, EnumItem[]>,
): BodyDataEnumCatalog {
  const catalog: BodyDataEnumCatalog = {};
  const assign = (field: keyof BodyDataEnumCatalog, type: string) => {
    const items = types[type];
    if (items) catalog[field] = items.map((item) => item.value);
  };

  assign('gender', 'gender');
  assign('skinTone', 'skin_tone');
  assign('bodyType', 'body_shape');
  assign('ageRange', 'age_range');
  assign('hairStyle', 'hair_style');
  assign('hairColor', 'hair_color');

  return catalog;
}

// 页面状态先判断产品必填完整性，再判断所有已填字段的合法性。
// 原因：后端 completed 只检查身高体重，不能表示专属模特资料已经就绪。
export function bodyDataPresentationState(
  draft: BodyDataDraft,
  catalog: BodyDataEnumCatalog = {},
): BodyDataPresentationState {
  if (!isRequiredBodyDataComplete(draft)) return 'incomplete';
  if (Object.keys(validateBodyDataDraft(draft, catalog)).length > 0) return 'invalid';
  return 'ready';
}

export function bodyDataSummary(profile: ProfileBodySource, bodyTypeLabel?: string): string {
  const draft = createBodyDataDraft(profile);
  if (!isRequiredBodyDataComplete(draft)) return '尚未完成必须资料';

  return `${profile.height} cm · ${profile.weight} kg · ${bodyTypeLabel || profile.bodyType}`;
}

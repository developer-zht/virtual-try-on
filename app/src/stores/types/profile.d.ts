/**
 * 让 Profile Store 的扁平状态覆盖完整身体数据与 v1.8.1 外观字段。
 * 原因：页面只消费 camelCase 状态，不应直接依赖 API 的嵌套 snake_case 结构。
 */
import type { EnumItem } from '@/api/types/metadata';

export interface ProfileState {
  height: number | null;
  weight: number | null;
  gender: string | null;
  skinTone: string | null;
  bodyType: string | null;
  ageRange: string | null;
  hairStyle: string | null;
  hairColor: string | null;
  shoulderWidth: number | null;
  waist: number | null;
  hip: number | null;
  thigh: number | null;
  calf: number | null;
  legLength: number | null;
  footLength: number | null;
  styles: string[];
  color: string | null;
  genModel: string | null;
  vlModel: string | null;
}

/** Store 从 /metadata/enums 选择 Profile 页面所需的字典分组。 */
export interface ProfileOptions {
  bodyTypes: EnumItem[];
  genders: EnumItem[];
  skinTones: EnumItem[];
  ageRanges: EnumItem[];
  hairStyles: EnumItem[];
  hairColors: EnumItem[];
  styleTags: EnumItem[];
  colors: EnumItem[];
}

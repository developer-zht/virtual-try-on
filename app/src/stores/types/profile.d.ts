import type { EnumItem } from '@/api/types/metadata';

// UI 面向的扁平形状（组件只看这个）
export interface ProfileState {
  height: number | null; // ← body.height_cm
  weight: number | null; // ← body.weight_kg
  shoulderWidth: number | null;
  waist: number | null;
  hip: number | null;
  thigh: number | null;
  calf: number | null;
  legLength: number | null;
  footLength: number | null; // 脚长 mm
  bodyType: string | null; // ← body.body_type_en（英文枚举值）
  styles: string[]; // ← preferences.style_tags_en（≤3）
  color: string | null; // ← preferences.color_preferences_en[0]
  skinTone: string | null; // 纯前端
  genModel: string | null; // 纯前端
  vlModel: string | null; // 纯前端
}

// 下拉/多选选项字典：store 从 /metadata/enums 挑这几类，防腐成 UI 分组。
// 每项 EnumItem{value,label_zh,label_en}：value 存进 profile.*，label_zh 用于显示。
export interface ProfileOptions {
  bodyTypes: EnumItem[]; // ← enums.types.body_shape
  styleTags: EnumItem[]; // ← enums.types.style_tag
  colors: EnumItem[]; // ← enums.types.color
}

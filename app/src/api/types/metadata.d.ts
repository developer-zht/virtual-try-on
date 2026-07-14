// GET /metadata/enums 的类型。取代已删除的 /metadata/profile-options
// （api/types/profile.d.ts 里老的 EnumOption / ProfileOptions 作废）。

/** 单条枚举项：value 是英文枚举值（发请求/入库用），label_zh/label_en 供 UI 显示 */
export interface EnumItem {
  value: string; // 如 "standard" / "minimalist" / "Black"
  label_zh: string; // 如 "标准"（中文 UI 显示这个）
  label_en: string; // 如 "Standard"
}

/** GET /metadata/enums（不带 type）的 data：一次返回全部类型的字典 */
export interface EnumsAll {
  types: Record<string, EnumItem[]>; // key 如 body_shape / style_tag / color / size_tops_cn ...
  loaded_at: string;
}

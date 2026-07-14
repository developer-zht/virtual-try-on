/** 尺码：注意后端在 GET 响应里把它嵌在 body.sizes 底下 */
export interface ProfileSizes {
  tops_cn: string | null;
  bottoms_waist_cn: string | null;
  bottoms_length_cn: string | null;
  shoes_cn: string | null;
  shoes_foot_length_mm: number | null;
}

/** 身体数据 */
export interface ProfileBody {
  height_cm: number | null;
  weight_kg: number | null;
  shoulder_width_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  leg_length_cm: number | null;
  body_type: string | null; // 中文，如 "标准"
  body_type_en: string | null; // 英文枚举，如 "standard"
  sizes: ProfileSizes;
}

/** 偏好：风格 / 颜色，中英双字段 */
export interface ProfilePreferences {
  style_tags: string[];
  style_tags_en: string[];
  color_preferences: string[];
  color_preferences_en: string[];
}

/** GET / PUT /users/me/profile 的 data（响应，嵌套结构） */
export interface Profile {
  body: ProfileBody;
  preferences: ProfilePreferences;
  completed: boolean;
  updated_at: string;
}

/**
 * PUT /users/me/profile 的请求体（扁平结构，和响应不一样！）
 * - 部分更新：所有字段都可选，只传要改的
 * - 尺码字段加了 size_ 前缀，且被拍平（不再嵌在 sizes 里）
 * - 传 null 表示清空该字段
 */
export interface ProfilePatch {
  height_cm?: number | null;
  weight_kg?: number | null;
  shoulder_width_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
  leg_length_cm?: number | null;
  body_type_en?: string;
  size_tops_cn?: string;
  size_bottoms_waist_cn?: string;
  size_bottoms_length_cn?: string;
  size_shoes_cn?: string;
  size_shoes_foot_length_mm?: number;
  style_tags_en?: string[]; // 最多 3 个
  color_preferences_en?: string[]; // 最多 5 个
}

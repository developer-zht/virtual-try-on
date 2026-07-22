/** GET 响应中嵌套在 body.sizes 下的中国码尺码。 */
export interface ProfileSizes {
  tops_cn: string | null;
  bottoms_waist_cn: string | null;
  bottoms_length_cn: string | null;
  shoes_cn: string | null;
  shoes_foot_length_mm: number | null;
}

/** GET/PUT 响应中的身体数据；中文字段用于展示，英文枚举值用于后续请求。 */
export interface ProfileBody {
  height_cm: number | null;
  weight_kg: number | null;
  shoulder_width_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  leg_length_cm: number | null;
  body_type: string | null;
  body_type_en: string | null;
  gender: string | null;
  gender_en: string | null;
  skin_tone: string | null;
  skin_tone_en: string | null;
  age_range: string | null;
  age_range_en: string | null;
  hair_style: string | null;
  hair_style_en: string | null;
  hair_color: string | null;
  hair_color_en: string | null;
  sizes: ProfileSizes;
}

/** 清空偏好后 Mock/Backend 可返回 null，读取映射会统一为 UI 可用的空值。 */
export interface ProfilePreferences {
  style_tags: string[] | null;
  style_tags_en: string[] | null;
  color_preferences: string[] | null;
  color_preferences_en: string[] | null;
}

/** GET /users/me/profile 与 PUT 成功响应的 data。 */
export interface Profile {
  body: ProfileBody;
  preferences: ProfilePreferences;
  completed: boolean;
  updated_at: string;
}

/**
 * PUT /users/me/profile 的扁平请求体。
 * 省略表示不更新，null 表示清空；height_cm/weight_kg 按契约不允许传 null。
 */
export interface ProfilePatch {
  height_cm?: number;
  weight_kg?: number;
  shoulder_width_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
  leg_length_cm?: number | null;
  body_type_en?: string | null;
  gender_en?: string | null;
  skin_tone_en?: string | null;
  age_range_en?: string | null;
  hair_style_en?: string | null;
  hair_color_en?: string | null;
  size_tops_cn?: string | null;
  size_bottoms_waist_cn?: string | null;
  size_bottoms_length_cn?: string | null;
  size_shoes_cn?: string | null;
  size_shoes_foot_length_mm?: number | null;
  style_tags_en?: string[] | null;
  color_preferences_en?: string[] | null;
}

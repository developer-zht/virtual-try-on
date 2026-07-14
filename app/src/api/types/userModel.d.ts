export interface UserModelRequest {
  gender: string; // 必填
  body_type: string; // 必填（与 profile body_type_en 共用）
  height_cm?: number;
  skin_tone?: string;
  age_range?: string;
  hair_style?: string;
  hair_color?: string;
  avatar_image_url?: string;
  model_name?: string;
}

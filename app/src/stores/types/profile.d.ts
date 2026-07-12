// UI 面向的扁平形状（组件只看这个）
export interface ProfileState {
  height: number | null; // 身高 cm       ← body.height_cm
  weight: number | null; // 体重 kg       ← body.weight_kg
  bodyType: string | null; // 体型         ← body.body_type_en（英文枚举值）
  styles: string[]; // 风格(多选,≤3)       ← preferences.style_tags_en
  color: string | null; // 颜色(单选)      ← preferences.color_preferences_en[0]
  skinTone: string | null; // 肤色 —— 纯前端，暂不发后端
  genModel: string | null; // 纯前端
  vlModel: string | null; // 纯前端
}

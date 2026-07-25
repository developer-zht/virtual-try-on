/**
 * 集中处理 Profile API 与 Store 状态之间的纯字段映射。
 * 原因：读取、保存都需要复用同一份映射，且纯函数可脱离 Pinia、MSW 和页面单独验证。
 */
import type { Profile, ProfilePatch } from '../api/types/profile';
import type { ProfileState } from './types/profile';

export function profileFromApi(profile: Profile): ProfileState {
  const { body, preferences } = profile;

  return {
    height: body.height_cm,
    weight: body.weight_kg,
    gender: body.gender_en,
    skinTone: body.skin_tone_en,
    bodyType: body.body_type_en,
    ageRange: body.age_range_en,
    hairStyle: body.hair_style_en,
    hairColor: body.hair_color_en,
    shoulderWidth: body.shoulder_width_cm,
    waist: body.waist_cm,
    hip: body.hip_cm,
    thigh: body.thigh_cm,
    calf: body.calf_cm,
    legLength: body.leg_length_cm,
    footLength: body.sizes.shoes_foot_length_mm,
    styles: preferences.style_tags_en ?? [],
    colors: [...(preferences.color_preferences_en ?? [])],
    genModel: null,
    vlModel: null,
  };
}

// function sameList(left: readonly string[], right: readonly string[]): boolean {
//   return left.length === right.length && left.every((value, index) => value === right[index]);
// }

function sameList(left: readonly string[], right: readonly string[]): boolean {
  const leftValues = new Set(left);
  const rightValues = new Set(right);

  return (
    leftValues.size === rightValues.size && [...leftValues].every((value) => rightValues.has(value))
  );
}

// 通过当前状态与读取快照生成最小 patch，并让可选字段保留 null 清空语义。
// 原因：接口要求“省略=不更新”；只按当前状态全量组装会覆盖并发产生的未修改服务端数据。
// 通过当前状态与读取快照生成最小 patch，并让可选字段保留 null 或空数组的清空语义。
// 接口要求“省略=不更新”；全量组装会覆盖并发产生的未修改服务端数据。
export function profileToPatch(current: ProfileState, initial: ProfileState): ProfilePatch {
  const patch: ProfilePatch = {};

  if (current.height !== initial.height && current.height !== null) {
    patch.height_cm = current.height;
  }
  if (current.weight !== initial.weight && current.weight !== null) {
    patch.weight_kg = current.weight;
  }
  if (current.gender !== initial.gender) patch.gender_en = current.gender;
  if (current.skinTone !== initial.skinTone) patch.skin_tone_en = current.skinTone;
  if (current.bodyType !== initial.bodyType) patch.body_type_en = current.bodyType;
  if (current.ageRange !== initial.ageRange) patch.age_range_en = current.ageRange;
  if (current.hairStyle !== initial.hairStyle) patch.hair_style_en = current.hairStyle;
  if (current.hairColor !== initial.hairColor) patch.hair_color_en = current.hairColor;
  if (current.shoulderWidth !== initial.shoulderWidth) {
    patch.shoulder_width_cm = current.shoulderWidth;
  }
  if (current.waist !== initial.waist) patch.waist_cm = current.waist;
  if (current.hip !== initial.hip) patch.hip_cm = current.hip;
  if (current.thigh !== initial.thigh) patch.thigh_cm = current.thigh;
  if (current.calf !== initial.calf) patch.calf_cm = current.calf;
  if (current.legLength !== initial.legLength) patch.leg_length_cm = current.legLength;
  if (current.footLength !== initial.footLength) {
    patch.size_shoes_foot_length_mm = current.footLength;
  }
  if (!sameList(current.styles, initial.styles)) {
    patch.style_tags_en = current.styles.slice(0, 3);
  }
  if (!sameList(current.colors, initial.colors)) {
    patch.color_preferences_en = current.colors.slice(0, 5);
  }

  return patch;
}

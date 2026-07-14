import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getProfile, updateProfile } from '@/api/profile'; // ← 去掉 getProfileOptions
import { getEnums } from '@/api/metadata'; // ← 新增
import type { Profile, ProfilePatch } from '@/api/types/profile'; // ← 去掉 ProfileOptions
import { validateHeight, validateWeight } from '@/utils/validators';
import { _runAsync } from './_runAsync';
import type { ProfileState, ProfileOptions } from './types/profile'; // ← ProfileOptions 现来自这里

const emptyProfile = (): ProfileState => ({
  height: null,
  weight: null,
  shoulderWidth: null,
  waist: null,
  hip: null,
  thigh: null,
  calf: null,
  legLength: null,
  footLength: null,
  bodyType: null,
  styles: [],
  color: null,
  skinTone: null,
  genModel: null,
  vlModel: null,
});

function fromApi(p: Profile): ProfileState {
  return {
    height: p.body.height_cm,
    weight: p.body.weight_kg,
    shoulderWidth: p.body.shoulder_width_cm,
    waist: p.body.waist_cm,
    hip: p.body.hip_cm,
    thigh: p.body.thigh_cm,
    calf: p.body.calf_cm,
    legLength: p.body.leg_length_cm,
    footLength: p.body.sizes.shoes_foot_length_mm,
    bodyType: p.body.body_type_en,
    styles: p.preferences.style_tags_en ?? [],
    color: p.preferences.color_preferences_en?.[0] ?? null,
    skinTone: null,
    genModel: null,
    vlModel: null,
  };
}

// toPatch 回到干净的 {}（前提：④ 已把 height_cm/weight_kg 改可选）
function toPatch(s: ProfileState): ProfilePatch {
  const patch: ProfilePatch = {};
  if (s.height !== null) patch.height_cm = s.height;
  if (s.weight !== null) patch.weight_kg = s.weight;
  if (s.bodyType !== null) patch.body_type_en = s.bodyType;
  patch.style_tags_en = s.styles.slice(0, 3);
  if (s.color !== null) patch.color_preferences_en = [s.color];
  return patch;
}

export const useProfileStore = defineStore('profile', () => {
  // ── state ──
  const profile = ref<ProfileState>(emptyProfile());
  const options = ref<ProfileOptions | null>(null); // ← 现在能解析到 ProfileOptions 了
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  // ── action：载入档案（嵌套 → 扁平）──
  async function fetchProfile() {
    const res = await _runAsync(() => getProfile(), loading, error);
    console.log('fetchProfiler', res);
    if (res) profile.value = fromApi(res);
  }

  // ── action：载入枚举选项（无需登录；非关键 → 静默失败）──
  async function fetchOptions() {
    try {
      const all = await getEnums(); // ← 换掉 getProfileOptions
      options.value = {
        bodyTypes: all.types.body_shape ?? [],
        styleTags: all.types.style_tag ?? [],
        colors: all.types.color ?? [],
      };
    } catch {
      /* 选项加载失败只是下拉没 label，不阻断页面 */
    }
  }

  // ── action：保存 ──
  async function saveProfile(): Promise<boolean> {
    const err = validateHeight(profile.value.height) ?? validateWeight(profile.value.weight);
    if (err) {
      error.value = err.message;
      return false;
    }
    const patch = toPatch(profile.value);
    const res = await _runAsync(() => updateProfile(patch), saving, error);
    console.log(res);
    if (!res) return false; // ← 删掉了 console.log
    profile.value = fromApi(res);
    return true;
  }

  return {
    profile,
    options,
    loading,
    saving,
    error,
    fetchProfile,
    fetchOptions,
    saveProfile,
  };
});

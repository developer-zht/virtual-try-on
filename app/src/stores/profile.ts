// 1:1 参考 —— 对照你 try-on-2d 的 src/stores/profile.ts（完整版）
// 映射层：嵌套 API ⇄ 扁平 UI。fromApi 拍平、toPatch 组装、saveProfile 双向都用。
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getProfile, updateProfile, getProfileOptions } from '@/api/profile';
import type { Profile, ProfilePatch, ProfileOptions } from '@/api/types/profile';
import { validateHeight, validateWeight } from '@/utils/validators';
import { _runAsync } from './_runAsync';
import type { ProfileState } from './types/profile';

// 工厂：每次返回全新对象（含全新 styles: []）
const emptyProfile = (): ProfileState => ({
  height: null,
  weight: null,
  bodyType: null,
  styles: [],
  color: null,
  skinTone: null,
  genModel: null,
  vlModel: null,
});

// 纯函数：嵌套 Profile → 扁平 ProfileState（fetch 和 save 成功后都用它）
function fromApi(p: Profile): ProfileState {
  return {
    height: p.body.height_cm,
    weight: p.body.weight_kg,
    bodyType: p.body.body_type_en,
    styles: p.preferences.style_tags_en ?? [],
    color: p.preferences.color_preferences_en?.[0] ?? null, // 数组 → 单选
    skinTone: null, // 纯前端：API 无来源，refetch 会回 null（不持久，代价）
    genModel: null,
    vlModel: null,
  };
}

// 纯函数：扁平 ProfileState → ProfilePatch（部分更新，只塞有值的）
function toPatch(s: ProfileState): ProfilePatch {
  const patch: ProfilePatch = {};
  if (s.height !== null) patch.height_cm = s.height;
  if (s.weight !== null) patch.weight_kg = s.weight;
  if (s.bodyType !== null) patch.body_type_en = s.bodyType;
  patch.style_tags_en = s.styles.slice(0, 3); // 后端上限 3，防御性截断
  if (s.color !== null) patch.color_preferences_en = [s.color]; // 单选 → 包成数组
  // skinTone / genModel / vlModel：纯前端，TODO 待后端支持后在这里补映射
  return patch;
}

export const useProfileStore = defineStore('profile', () => {
  // ── state ──
  const profile = ref<ProfileState>(emptyProfile());
  const options = ref<ProfileOptions | null>(null); // 下拉/多选的选项字典
  const loading = ref(false); // 载入中（fetchProfile）
  const saving = ref(false); // 保存中（saveProfile）—— 契约外补充，保存按钮要用
  const error = ref<string | null>(null);

  // ── action：载入档案（嵌套 → 扁平）──
  async function fetchProfile() {
    const res = await _runAsync(() => getProfile(), loading, error);
    if (res) profile.value = fromApi(res);
  }

  // ── action：载入枚举选项（无需登录；非关键 → 静默失败，不打扰用户）──
  // DELETE: 后端删除 GET /metadata/profile-options
  // async function fetchOptions() {
  //   try {
  //     options.value = await getProfileOptions();
  //   } catch {
  //     /* 选项加载失败只是下拉没 label，不阻断页面 */
  //   }
  // }

  // ── action：保存（校验 → 组装 patch → PUT → 用后端返回反向刷新）──
  async function saveProfile(): Promise<boolean> {
    // ① 就地范围校验（身高/体重），失败直接回、不发请求
    const err = validateHeight(profile.value.height) ?? validateWeight(profile.value.weight);
    if (err) {
      error.value = err.message;
      return false;
    }
    // ② 扁平 → ProfilePatch
    const patch = toPatch(profile.value);
    // ③ PUT；成功后用后端返回的最新 Profile 覆盖本地（server 是真理源）
    const res = await _runAsync(() => updateProfile(patch), saving, error);
    if (!res) return false;
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
    // fetchOptions,
    saveProfile,
  };
});

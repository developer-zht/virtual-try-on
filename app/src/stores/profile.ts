/**
 * 同步 v1.8.1 ProfileState/ProfileOptions，并接入统一读取与保存映射。
 * 原因：旧 Store 仍构造旧字段集合，导致新增 gender、ageRange、hairStyle、hairColor 和枚举分组后编译失败。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getProfile, updateProfile } from '@/api/profile';
import { getEnums } from '@/api/metadata';
import type { Profile } from '@/api/types/profile';
// 复用正式项目现有异步状态工具，提案不复制未修改的公共实现。
import { _runAsync } from '@/stores/_runAsync';
import { validateHeight, validateWeight } from '@/utils/validators';
import { profileFromApi, profileToPatch } from './profileMapping';
import type { ProfileOptions, ProfileState } from './types/profile';

// 空状态覆盖 ProfileState 的全部字段，新外观字段统一以 null 表示尚未读取或未填写。
// 原因：类型增加字段后，每个 ProfileState 构造点都必须提供完整且一致的默认值。
function createEmptyProfile(): ProfileState {
  return {
    height: null,
    weight: null,
    gender: null,
    skinTone: null,
    bodyType: null,
    ageRange: null,
    hairStyle: null,
    hairColor: null,
    shoulderWidth: null,
    waist: null,
    hip: null,
    thigh: null,
    calf: null,
    legLength: null,
    footLength: null,
    styles: [],
    color: null,
    genModel: null,
    vlModel: null,
  };
}

function cloneProfile(profile: ProfileState): ProfileState {
  return {
    ...profile,
    styles: [...profile.styles],
  };
}

function hasPatchFields(patch: object): boolean {
  return Object.keys(patch).length > 0;
}

export const useProfileStore = defineStore('profile', () => {
  const emptyProfile = createEmptyProfile();
  const profile = ref<ProfileState>(emptyProfile);
  const options = ref<ProfileOptions | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  let savedSnapshot = cloneProfile(emptyProfile);

  // API 响应写入 UI 状态的同时刷新保存基线。
  // 原因：后续 PUT 必须和最近一次服务端确认状态比较，才能生成最小三态 patch。
  function acceptServerProfile(response: Profile) {
    const next = profileFromApi(response);
    profile.value = next;
    savedSnapshot = cloneProfile(next);
  }

  async function fetchProfile(): Promise<void> {
    const response = await _runAsync(() => getProfile(), loading, error);
    if (response) acceptServerProfile(response);
  }

  // ProfileOptions 与 metadata/enums 的八个实际 type 一一对应。
  // 原因：只填旧的 bodyTypes/styleTags/colors 会触发 TS2322，也会让新增外观选择器没有数据。
  async function fetchOptions(): Promise<void> {
    try {
      const all = await getEnums();
      options.value = {
        bodyTypes: all.types.body_shape ?? [],
        genders: all.types.gender ?? [],
        skinTones: all.types.skin_tone ?? [],
        ageRanges: all.types.age_range ?? [],
        hairStyles: all.types.hair_style ?? [],
        hairColors: all.types.hair_color ?? [],
        styleTags: all.types.style_tag ?? [],
        colors: all.types.color ?? [],
      };
    } catch {
      // 枚举是非关键展示数据；加载失败时保留原 options，不阻断 Profile 主流程。
    }
  }

  // 候选 Profile 只参与校验和差异计算；Store 只接纳服务端成功响应。
  // 原因：PUT 完成前发布候选值，会让其他页面短暂读取到尚未被服务器确认的数据。
  async function saveProfile(next: ProfileState): Promise<boolean> {
    const validationError = validateHeight(next.height) ?? validateWeight(next.weight);
    if (validationError) {
      error.value = validationError.message;
      return false;
    }

    const patch = profileToPatch(next, savedSnapshot);
    if (!hasPatchFields(patch)) {
      error.value = null;
      return true;
    }

    const response = await _runAsync(() => updateProfile(patch), saving, error);
    if (!response) return false;

    acceptServerProfile(response);
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

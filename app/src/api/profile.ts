import { request } from './request';
import { API } from './_configs/url';
import type { Profile, ProfilePatch } from './types/profile'; // ← 去掉 ProfileOptions

/** 获取当前用户的身体数据与偏好（需登录） */
export function getProfile(): Promise<Profile> {
  return request<Profile>({ url: API.user.profile, method: 'GET' });
}

/** 部分更新 Profile：只传要改的字段（需登录） */
export function updateProfile(patch: ProfilePatch): Promise<Profile> {
  return request<Profile>({ url: API.user.profile, method: 'PUT', data: patch });
}
// getProfileOptions 已删：端点 /metadata/profile-options 被后端移除，改用 metadata.ts 的 getEnums

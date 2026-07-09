import { request } from './request';
import { API } from './_configs/url';
import type { Profile, ProfileOptions, ProfilePatch } from './types/profile';

/** 获取当前用户的身体数据与偏好（需登录） */
export function getProfile(): Promise<Profile> {
  return request<Profile>({ url: API.user.profile, method: 'GET' });
}

/** 部分更新 Profile：只传要改的字段（需登录） */
export function updateProfile(patch: ProfilePatch): Promise<Profile> {
  return request<Profile>({ url: API.user.profile, method: 'PUT', data: patch });
}

/** 获取 Profile 表单枚举选项（无需登录） */
export function getProfileOptions(): Promise<ProfileOptions> {
  return request<ProfileOptions>({ url: API.user.profileOptions, method: 'GET' });
}

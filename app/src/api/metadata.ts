import { request } from './request';
import { API } from './_configs/url';
import type { EnumsAll } from './types/metadata';

/** 一次拉取全部枚举字典（无需登录）。取代 getProfileOptions；store 自己挑要用的类型。 */
export function getEnums(): Promise<EnumsAll> {
  return request<EnumsAll>({ url: API.metadata.enums, method: 'GET' });
}

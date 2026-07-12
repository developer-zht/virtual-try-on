import { API } from './_configs/url';
import { request } from './request';
import type { LoginRaw } from './types/login';

// 字段抽取集中一处：后端改名只改这里（解决"满项目找 access_token"）
export function extractAccessToken(json: unknown): string | undefined {
  const j = json as { data?: { access_token?: unknown }; access_token?: unknown };
  const t = j?.data?.access_token ?? j?.access_token;
  return typeof t === 'string' ? t : undefined; // 类型校验，非 string 视作没有
}

// 用当前 token 换回"我是谁"。刷新页面后 user 丢了，用它复活。
// 返回类型先按 login 的 user 形状；若 /auth/me 返回更多字段（摘要），再扩展这个类型。
export function getMe(): Promise<LoginRaw['user']> {
  return request<LoginRaw['user']>({ url: API.auth.me, method: 'GET' });
}

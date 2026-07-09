import { getRouter } from '@/router';
import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { API } from './_configs/url';
import { STORAGE_KEYS } from '@/constants/storage';
import { getCookie } from '@/utils/cookie';
import { extractAccessToken } from './auth';

export const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.API_BASE_URL || '/api',
  timeout: 15000, // 15s 超时，防止请求悬挂
});

// 请求拦截：自动带上登录 token
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：只做"统一错误"，不动数据结构
instance.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalConfig = err.config;

    if (err.response?.status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true; // ① 打标记：这条已经尝试过刷新

      try {
        // credentials:'include' 让浏览器自动带上 httpOnly 的 refresh cookie
        const res: Response = await fetch(API.auth.refresh, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': getCookie(STORAGE_KEYS.csrfToken) ?? '' },
        });
        if (!res.ok) throw new Error(`refresh HTTP ${res.status}`); // 非 2xx 直接失败

        const text = await res.text();
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('refresh 返回非 JSON');
        }

        // 集中取值 + 校验类型：改名/缺失不会静默 undefined
        const token = extractAccessToken(json);
        if (!token) throw new Error('refresh 未返回 access_token');

        localStorage.setItem(STORAGE_KEYS.accessToken, token); // 存新 access

        originalConfig.headers.Authorization = `Bearer ${token}`;

        return instance.request(originalConfig);
      } catch (refreshErr) {
        console.log(refreshErr);

        localStorage.removeItem(STORAGE_KEYS.accessToken);
        void getRouter().push('/auth/login'); // 不加 / 会被当成相对当前路由

        return Promise.reject(
          refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr)),
        );
      }
    }

    return Promise.reject(err);
  },
);

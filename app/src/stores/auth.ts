// 新增 restore()：刷新后用 token 复活 user
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginAPI } from '@/api/login'; // 你现有的：login 在 api/login.ts
import { getMe } from '@/api/auth'; // 新增的 getMe 在 api/auth.ts
import type { LoginRaw } from '@/api/types/login';
import { STORAGE_KEYS } from '@/constants/storage';
import { validateEmail, validatePassword } from '@/utils/validators';
import { _runAsync } from '@/stores/_runAsync';
import type { LoginPayload } from '@/stores/types/auth';
import { useNotifyStore } from '@/stores/notify';

type SessionUser = LoginRaw['user'];

export const useAuthStore = defineStore('auth', () => {
  // ── state ──
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.accessToken));
  const user = ref<SessionUser | null>(null);
  const showAuth = ref(false);
  const authMode = ref<'register' | 'login'>('login');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── getter ──
  const loggedIn = computed(() => !!token.value);

  // ── actions：弹层 ──
  function openAuth(mode: 'register' | 'login' = 'login') {
    authMode.value = mode;
    error.value = null;
    showAuth.value = true;
  }

  function closeAuth() {
    showAuth.value = false;
  }

  // ── action：登录 ──
  async function login(payload: LoginPayload): Promise<boolean> {
    const fieldErr = validateEmail(payload.email) ?? validatePassword(payload.password);
    if (fieldErr) {
      error.value = fieldErr.message;
      return false;
    }
    const raw = await _runAsync(() => loginAPI(payload.email, payload.password), loading, error);
    if (!raw) return false;
    localStorage.setItem(STORAGE_KEYS.accessToken, raw.access_token); // 盒子①
    token.value = raw.access_token; // 盒子②
    user.value = raw.user;
    closeAuth();
    if (import.meta.env.QCLI_DEMO)
      useNotifyStore().info('您已登录测试账号，该账号人物已固定为小麦肤色的女性', 10_000);
    return true;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    token.value = null;
    user.value = null;
  }

  // ── action：刷新后复活 user（best-effort，静默，不走 loading/error）──
  async function restore() {
    if (!token.value) return; // 没 token = 本来就没登录，不用管
    try {
      user.value = await getMe(); // 用 token 换回身份
    } catch {
      // token 失效：本地兜底登出（http 拦截器多半已清 token 并跳登录，这里只是保险）
      logout();
    }
  }

  function acceptAvatarUrl(url: string): void {
    if (!user.value) return;
    user.value = {
      ...user.value,
      avatar_url: url,
    };
  }

  return {
    token,
    user,
    showAuth,
    authMode,
    loading,
    error,
    loggedIn,
    openAuth,
    closeAuth,
    login,
    logout,
    restore,
    acceptAvatarUrl,
  };
});

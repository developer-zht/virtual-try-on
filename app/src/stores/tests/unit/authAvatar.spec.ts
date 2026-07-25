/**
 * 测试类型：单元测试。
 * 测试对象/范围：Auth Store 接纳已完成专属模特图片 URL 的单一动作。
 * 隔离内容：不连接 Backend、不执行登录和身份恢复；使用独立 Pinia 与内存 localStorage。
 */
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/login', () => ({ login: vi.fn() }));
vi.mock('@/api/auth', () => ({ getMe: vi.fn() }));
vi.mock('@/utils/validators', () => ({
  validateEmail: vi.fn(),
  validatePassword: vi.fn(),
}));
vi.mock('@/stores/_runAsync', () => ({ _runAsync: vi.fn() }));
vi.mock('@/stores/notify', () => ({
  useNotifyStore: () => ({ info: vi.fn() }),
}));

import { useAuthStore } from '../../auth';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  setActivePinia(createPinia());
});

afterEach(() => vi.unstubAllGlobals());

describe('acceptAvatarUrl', () => {
  it('只替换已登录用户的 avatar_url，并保留其他身份字段', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'user-001',
      email: 'user@example.com',
      nickname: 'Veslune',
      avatar_url: '/old-model.png',
      city_code: '101010100',
    };
    const acceptAvatarUrl = (auth as typeof auth & { acceptAvatarUrl?: (url: string) => void })
      .acceptAvatarUrl;

    expect(acceptAvatarUrl).toEqual(expect.any(Function));
    acceptAvatarUrl?.('/new-model.png');

    expect(auth.user).toEqual({
      id: 'user-001',
      email: 'user@example.com',
      nickname: 'Veslune',
      avatar_url: '/new-model.png',
      city_code: '101010100',
    });
  });
});

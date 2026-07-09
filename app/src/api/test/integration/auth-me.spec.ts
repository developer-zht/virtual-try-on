import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { optionalEnv, requireEnv } from './support/env';

const BASE_URL = requireEnv('VITE_API_BASE_URL');
const EMAIL = requireEnv('VITE_TEST_EMAIL');
const PASSWORD = requireEnv('VITE_TEST_PASSWORD');
const NICKNAME = optionalEnv('VITE_TEST_NICKNAME', 'tester'); // 昵称可选，给默认值
let token: string | undefined;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('auth 集成测试', () => {
  // 冒烟测试
  it('GET /auth/me 返回 200', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  it('验证 GET /auth/me 返回数据的结构的正确性', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      garment_count: expect.any(Number),
      profile_completed: expect.any(Boolean),
    });
  });
});

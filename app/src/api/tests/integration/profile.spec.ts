import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, PASSWORD, NICKNAME } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('profile 集成测试', () => {
  it('GET /users/me/profile —— body / preferences / completed 都在', async () => {
    const res = await fetch(`${BASE_URL}/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toMatchObject({
      body: { sizes: expect.any(Object) },
      preferences: {
        style_tags_en: expect.any(Array),
        color_preferences_en: expect.any(Array),
      },
      completed: expect.any(Boolean),
      updated_at: expect.any(String),
    });
  });

  it('PUT /users/me/profile —— 部分更新后能读回新值', async () => {
    const res = await fetch(`${BASE_URL}/users/me/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ height_cm: 175, style_tags_en: ['minimalist'] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // 读写不对称：写发扁平 height_cm，读在 data.body.height_cm 底下
    expect(body.data.body.height_cm).toBe(175);
    expect(body.data.preferences.style_tags_en).toContain('minimalist');
  });

  it('GET /metadata/profile-options —— 无需鉴权', async () => {
    const res = await fetch(`${BASE_URL}/metadata/profile-options`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      body_types: expect.any(Array),
      style_tags: expect.any(Array),
      colors: expect.any(Array),
      sizes: { tops_cn: expect.any(Array) },
    });
  });
});

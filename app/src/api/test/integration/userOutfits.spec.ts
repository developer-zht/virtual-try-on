import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, PASSWORD, NICKNAME } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('user/outfits 集成测试', () => {
  it('GET /user/outfits —— 200 且 data.items 是数组（无 pagination）', async () => {
    const res = await fetch(`${BASE_URL}/user/outfits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('POST /user/outfits —— garment_ids 为空应被拒（非 0 业务码）', async () => {
    const res = await fetch(`${BASE_URL}/user/outfits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 't', occasion_en: 'commute', garment_ids: [] }),
    });
    const body = await res.json();
    expect(body.code).not.toBe(0); // 文档：garment_ids 至少 1 个
  });

  it('无 token 访问 /user/outfits 应被拒（401）', async () => {
    const res = await fetch(`${BASE_URL}/user/outfits`);
    expect(res.status).toBe(401);
  });
});

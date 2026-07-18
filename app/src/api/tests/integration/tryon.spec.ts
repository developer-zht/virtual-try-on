import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, PASSWORD, NICKNAME } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('tryon 集成测试', () => {
  it('POST /tryon —— 未实现，固定 501', async () => {
    const res = await fetch(`${BASE_URL}/tryon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe(50100);
  });

  it('GET /tryon/results/:id —— 不存在的结果应被拒（非 0 业务码）', async () => {
    const res = await fetch(`${BASE_URL}/tryon/results/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.code).not.toBe(0);
  });
});

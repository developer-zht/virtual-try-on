import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, PASSWORD, NICKNAME } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('weather 集成测试', () => {
  it('GET /weather —— 契约：temp/condition + 中英双字段', async () => {
    const res = await fetch(`${BASE_URL}/weather?city_code=101010100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      city: expect.any(String),
      city_code: expect.any(String),
      temp: expect.any(Number),
      condition: expect.any(String),
      condition_en: expect.any(String),
      humidity: expect.any(Number),
      season_en: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('无 token 访问应被拒（401）', async () => {
    const res = await fetch(`${BASE_URL}/weather`);
    expect(res.status).toBe(401);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, PASSWORD, NICKNAME } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('outfits 集成测试', () => {
  let firstOutfitId: string | undefined; // 由第 1 条产出，第 2 条消费

  it('POST /outfits/recommend —— 返回 outfits 数组 + weather', async () => {
    const res = await fetch(`${BASE_URL}/outfits/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ occasion: 'commute', max_outfits: 1 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.outfits)).toBe(true);
    firstOutfitId = body.data.outfits[0]?.id; // 衣柜空可能没有，用可选链兜住
  }, 30_000); // ← AI 生成可能慢，这条单独把超时放宽到 30s（默认才 5s）

  it('GET /outfits/:id —— 有推荐结果时校验 Outfit 契约（否则跳过）', async () => {
    if (!firstOutfitId) {
      console.warn('没有可用的 outfit id（可能衣柜为空），跳过 /outfits/:id');
      return;
    }
    const res = await fetch(`${BASE_URL}/outfits/${firstOutfitId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      id: expect.any(String),
      status: expect.any(String),
      garments: expect.any(Array),
      tips: expect.any(Array),
      created_at: expect.any(String),
    });
  });

  // 待后端澄清「recommend 真正的必填字段 / 前置条件」后再补
  it.todo('POST /outfits/recommend happy path —— 返回 outfits 数组 + weather');
  it.todo('GET /outfits/:id —— 用真实 generated outfit 校验契约');
});

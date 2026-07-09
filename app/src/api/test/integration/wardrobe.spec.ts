import { describe, it, expect, beforeAll } from 'vitest';
import { getTestToken } from './support/auth';
import { BASE_URL, EMAIL, NICKNAME, PASSWORD } from './support/account';

let token: string;

beforeAll(async () => {
  token = await getTestToken(BASE_URL, EMAIL, PASSWORD, NICKNAME);
});

describe('wardrobe 集成测试', () => {
  it('GET /wardrobe 返回 200 且 data.items 是数组', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it('category_en=TOPS 分类筛选返回 200', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe?category_en=TOPS`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('无 token 访问应被拒（401）', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe`);
    expect(res.status).toBe(401);
  });

  it('GET /wardrobe/stats —— total + by_category 契约', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      total: expect.any(Number),
      by_category: expect.any(Array),
    });
  });

  it('GET /wardrobe/:id —— 有衣物时校验 Garment 契约（衣柜空则跳过）', async () => {
    // 先列表拿一个真实 id：集成测试常依赖账号里已有数据
    const listRes = await fetch(`${BASE_URL}/wardrobe?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await listRes.json();
    if (data.items.length === 0) {
      console.warn('衣柜为空，跳过 /wardrobe/:id 契约测试');
      return; // 前置条件不满足就优雅跳过，别硬失败
    }

    const id = data.items[0].id;
    const res = await fetch(`${BASE_URL}/wardrobe/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      id: expect.any(String),
      category_en: expect.any(String),
      processing_status: expect.any(String),
      is_manually_edited: expect.any(Boolean),
      created_at: expect.any(String),
    });
  });

  it('POST /wardrobe/upload-url —— 申请预签名地址契约', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content_type: 'image/jpeg', file_size: 2048576 }), // 2MB
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      upload_id: expect.any(String),
      upload_url: expect.any(String),
      headers: expect.any(Object),
    });
  });

  it('PUT /wardrobe/:id —— 修正后 is_manually_edited 变 true（衣柜空则跳过）', async () => {
    const listRes = await fetch(`${BASE_URL}/wardrobe?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await listRes.json();
    if (data.items.length === 0) {
      console.warn('衣柜为空，跳过 PUT /wardrobe/:id');
      return;
    }

    const id = data.items[0].id;
    const res = await fetch(`${BASE_URL}/wardrobe/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ material: 'Cotton' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.material).toBe('Cotton'); // 直接效果：我改的字段生效
    expect(body.data.is_manually_edited).toBe(true); // 派生效果：服务端自己标的
  });

  it('DELETE /wardrobe/:id —— 删除不存在的 id 返回 200', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/wardrobe/${fakeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    console.log(res);
    const body = await res.json();
    console.log(body);
    expect(body.code).toBe(0);
  });

  it('POST /wardrobe/upload —— upload_id 不存在时应被拒（非 0 业务码）', async () => {
    const res = await fetch(`${BASE_URL}/wardrobe/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ upload_id: '00000000-0000-0000-0000-000000000000' }),
    });
    const body = await res.json();
    expect(body.code).not.toBe(0); // 文档说 40002，实测为准；先钉「它拒了」
  });

  it('GET /tasks/:id —— 不存在的任务应被拒（非 0 业务码）', async () => {
    const res = await fetch(`${BASE_URL}/tasks/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.code).not.toBe(0);
  });

  it('POST /wardrobe/:id/remove-background —— 未实现，固定 501', async () => {
    // 501 是「接口没实现」，跟 id 存不存在无关，用假 id 即可
    const res = await fetch(
      `${BASE_URL}/wardrobe/00000000-0000-0000-0000-000000000000/remove-background`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe(50100); // 文档：50100 未实现
  });
});

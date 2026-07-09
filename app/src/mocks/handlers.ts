// 覆盖：鉴权 / 衣柜 / 档案 / 推荐 / 试穿 / 异步任务 / 今日穿搭 / 收藏
// 用法：拷到 Quasar 工程 src/mocks/handlers.ts，配 browser.ts + boot/msw.ts 使用。
// 约定：前端 BASE_URL='/api'，故路径都以 /api/v1 开头；统一信封 {code,message,data}。
import { http, HttpResponse } from 'msw';

// ── 统一响应信封 ──
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: 'ok', data });
const fail = (code: number, message: string, status = 400) =>
  HttpResponse.json({ code, message, data: null }, { status });

// ── 简易内存态（刷新页面即重置）──
let wardrobe = [
  {
    id: 'g_1',
    name: '卡其色风衣',
    category: '外套',
    color: '卡其',
    season: '春秋',
    tags: ['通勤', '经典款', '风衣'],
    icon: '🧥',
  },
  {
    id: 'g_2',
    name: '白色衬衫',
    category: '上衣',
    color: '白',
    season: '四季',
    tags: ['通勤', '百搭', '衬衫'],
    icon: '👔',
  },
  {
    id: 'g_3',
    name: '深灰西裤',
    category: '下装',
    color: '深灰',
    season: '四季',
    tags: ['通勤', '直筒', '西裤'],
    icon: '👖',
  },
];

let outfits = [
  {
    id: 'o_1',
    name: '简约通勤风_0629',
    date: '2026-06-29',
    occasion: '通勤',
    weather: '☀️ 26°C',
    feel: '舒适',
    garments: ['卡其色风衣', '白色衬衫', '深灰西裤'],
    tags: ['简约', '通勤', '卡其色'],
    tip: '通勤得体又不失时尚感。',
    source: 'Tag5 穿搭结果',
  },
];

let todayOutfit = {
  name: '简约通勤风',
  garments: ['卡其色风衣', '白色衬衫', '深灰西裤'],
  tags: ['简约', '通勤'],
  tip: '通勤得体又不失时尚感。',
  weather: '☀️ 26°C',
  occasion: '通勤',
};

// ── 异步任务：识别/试穿返回 task_id，前端轮询 /tasks/:id ──
const tasks = new Map<string, { type: 'segment' | 'tryon'; createdAt: number }>();
const newTask = (type: 'segment' | 'tryon') => {
  const id = `${type}_${Date.now()}`;
  tasks.set(id, { type, createdAt: Date.now() });
  return id;
};

export const handlers = [
  // ============ 鉴权（Tag1）============
  http.post('/api/v1/auth/send-code', async ({ request }) => {
    const { phone } = (await request.json()) as { phone: string };
    if (!/^1\d{10}$/.test(phone)) return fail(1001, '手机号格式错误');
    return ok({ ttl: 60 });
  }),
  http.post('/api/v1/auth/register', async ({ request }) => {
    console.log('[mock] register', await request.json());
    return ok({ token: 'mock.jwt.token', user_id: 'u_1', is_new_user: true });
  }),
  http.post('/api/v1/auth/login', async ({ request }) => {
    console.log('[mock] login', await request.json());
    return ok({ token: 'mock.jwt.token', user_id: 'u_1', is_new_user: false });
  }),
  http.post('/api/v1/auth/oauth', async ({ request }) => {
    const { provider } = (await request.json()) as { provider: string };
    return ok({ token: 'mock.jwt.token', user_id: 'u_1', is_new_user: false, provider });
  }),

  // ============ 衣柜（Tag2 上传 / Tag7 / step10）============
  http.post('/api/v1/wardrobe/upload', () => {
    const garment_id = `g_${Date.now()}`;
    const task_id = newTask('segment');
    // 先塞占位单品，识别完成后由前端轮询回填属性
    wardrobe.unshift({
      id: garment_id,
      name: '识别中…',
      category: '未知',
      color: '',
      season: '',
      tags: [],
      icon: '🕓',
    });
    return ok({ task_id, garment_id });
  }),
  http.get('/api/v1/wardrobe', ({ request }) => {
    const cat = new URL(request.url).searchParams.get('category') || '全部';
    const items = cat === '全部' ? wardrobe : wardrobe.filter((w) => w.category === cat);
    return ok({ total: items.length, items });
  }),
  http.delete('/api/v1/wardrobe/:id', ({ params }) => {
    wardrobe = wardrobe.filter((w) => w.id !== params.id);
    return ok({ deleted: true });
  }),

  // ============ 用户档案（Tag3 / step9）============
  http.get('/api/v1/user/profile', () =>
    ok({
      height: 170,
      weight: 65,
      shoulder: 44,
      body_shape: '沙漏形',
      size: 'M',
      styles: ['简约'],
      colors: ['黑', '白'],
      pants: '长裤',
    }),
  ),
  http.put('/api/v1/user/profile', async ({ request }) => {
    console.log('[mock] update profile', await request.json());
    return ok({ updated: true });
  }),

  // ============ 推荐 & 试穿（Tag4 / Tag5 / Tag7）============
  http.post('/api/v1/outfits/recommend', async ({ request }) => {
    console.log('[mock] recommend', await request.json());
    return ok({
      outfits: [
        {
          id: 'o_r1',
          garments: ['卡其色风衣', '白色衬衫', '深灰西裤', '棕色乐福鞋'],
          tags: ['简约', '通勤', '卡其色'],
          tip: '通勤得体又不失时尚感。',
          weather: '☀️ 26°C',
          occasion: '通勤',
        },
        {
          id: 'o_r2',
          garments: ['黑色皮衣', '格纹衬衫', '束脚运动裤', '白色运动鞋'],
          tags: ['街头', '约会', '黑色系'],
          tip: '皮衣搭配格纹衬衫，街头感十足。',
          weather: '☀️ 22°C',
          occasion: '约会',
        },
      ],
    });
  }),
  http.post('/api/v1/tryon', () => ok({ task_id: newTask('tryon') })),

  // ============ 异步任务轮询（识别 / 试穿）============
  http.get('/api/v1/tasks/:id', ({ params }) => {
    const t = tasks.get(params.id as string);
    if (!t) return ok({ task_id: params.id, status: 'not_found' });
    const elapsed = Date.now() - t.createdAt;
    // 头 1.5 秒返回 processing，之后 done —— 方便你看到轮询效果
    if (elapsed < 1500) return ok({ task_id: params.id, task_type: t.type, status: 'processing' });
    const result =
      t.type === 'tryon'
        ? { success: true, image_url: 'https://picsum.photos/300/400' }
        : {
            success: true,
            garment: {
              id: 'g_x',
              name: '卡其色风衣',
              category: '外套',
              color: '卡其',
              season: '春秋',
              tags: ['通勤', '风衣'],
              icon: '🧥',
            },
          };
    return ok({ task_id: params.id, task_type: t.type, status: 'done', result });
  }),

  // ============ 今日穿搭（step12 / step11 应用）============
  http.get('/api/v1/user/today-outfit', () => ok(todayOutfit)),
  http.put('/api/v1/user/today-outfit', async ({ request }) => {
    const body = (await request.json()) as { outfit_id?: string };
    const found = outfits.find((o) => o.id === body.outfit_id);
    if (found) {
      todayOutfit = {
        name: found.name,
        garments: found.garments,
        tags: found.tags,
        tip: found.tip,
        weather: found.weather,
        occasion: found.occasion,
      };
    }
    return ok({ updated: true });
  }),

  // ============ 收藏穿搭（Tag5/Tag7 保存 / step11）============
  http.get('/api/v1/user/outfits', () => ok({ items: outfits })),
  http.post('/api/v1/user/outfits', async ({ request }) => {
    const body = (await request.json()) as Omit<(typeof outfits)[number], 'id'>;
    const id = `o_${Date.now()}`;
    outfits.unshift({ id, ...body });
    return ok({ outfit_id: id });
  }),
  http.delete('/api/v1/user/outfits/:id', ({ params }) => {
    outfits = outfits.filter((o) => o.id !== params.id);
    return ok({ deleted: true });
  }),
];

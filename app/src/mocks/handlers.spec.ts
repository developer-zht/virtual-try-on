/**
 * 测试类型：集成测试。
 * 测试对象/范围：通过 MSW 核对 v1.8.1 Profile 读取/保存、metadata 枚举、用户模特创建与任务轮询契约。
 * 隔离内容：不连接真实 Backend、不测试 Profile API 封装、Pinia Store或 Vue 页面。
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, resetMockState, setMockScenario } from './handlers';

const API = 'https://veslune.aabbaq.com/api/v1';
const server = setupServer(...handlers);

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, init);

  return {
    status: response.status,
    body: (await response.json()) as {
      code: number;
      message: string;
      data: Record<string, unknown> | null;
    },
  };
}

async function getProfile() {
  return json('/users/me/profile');
}

async function updateProfile(patch: Record<string, unknown>) {
  return json('/users/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => server.close());

describe('Mock Profile 契约', () => {
  // CODEX-PHASE-5：新注册身份的两处完成度必须一致为 false。
  // 原因：注册响应不能继承当前 Mock 场景中已有用户的 Profile 状态。
  it('注册响应顶层和 user 都标记 Profile 未完成', async () => {
    setMockScenario('ready-today');

    const response = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: '新用户' }),
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      profile_completed: false,
      user: { profile_completed: false },
    });
  });

  // CODEX-PHASE-5：一次性锁定后续 Store 映射需要的完整数值 fixture。
  // 原因：只提供身高体重会让肩腰臀腿和脚长的读取、回显、保存测试失去可靠基线。
  it('默认场景提供完整的身体测量与脚长数据', async () => {
    setMockScenario('ready-today');

    const response = await getProfile();

    expect(response.body.data).toMatchObject({
      body: {
        height_cm: 175,
        weight_kg: 52,
        shoulder_width_cm: 38,
        waist_cm: 66,
        hip_cm: 90,
        thigh_cm: 50,
        calf_cm: 34,
        leg_length_cm: 82,
        sizes: { shoes_foot_length_mm: 235 },
      },
    });
  });

  it('默认场景返回 v1.8.1 的五组外观中英文字段', async () => {
    setMockScenario('ready-today');

    const response = await getProfile();

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data).toMatchObject({
      body: {
        gender: '女',
        gender_en: 'female',
        skin_tone: '自然',
        skin_tone_en: 'medium',
        age_range: '26–35',
        age_range_en: '26_35',
        hair_style: '长发',
        hair_style_en: 'long',
        hair_color: '黑色',
        hair_color_en: 'black',
      },
    });
  });

  // CODEX-PHASE-5：先锁定五个新增英文枚举字段的 PUT 写入与后续 GET 回读行为。
  // 原因：后续 Profile Store 保存依赖这组扁平请求字段，Mock 不能只提供初始 fixture 而丢弃更新。
  it('PUT 五个外观英文枚举字段后，响应与后续 GET 都返回新值', async () => {
    setMockScenario('ready-today');
    const patch = {
      gender_en: 'male',
      skin_tone_en: 'tan',
      age_range_en: '36_45',
      hair_style_en: 'short',
      hair_color_en: 'brown',
    };

    const updated = await updateProfile(patch);
    const fetched = await getProfile();

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ body: patch });
    expect(fetched.body.data).toMatchObject({ body: patch });
  });

  // CODEX-PHASE-5：单独锁定后端 `completed` 只检查身高和体重的契约。
  // 原因：`body_type_en` 可清空，不能把 Profile 完成度误当成生成模特所需字段是否齐全。
  it('身高体重仍存在时，清空 body_type_en 不改变 completed', async () => {
    setMockScenario('ready-today');

    const updated = await updateProfile({ body_type_en: null });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      body: { height_cm: 175, weight_kg: 52, body_type_en: null },
      completed: true,
    });
  });

  // CODEX-PHASE-5：覆盖 Profile 扁平 PUT 到嵌套响应、中文 label 和偏好数组的完整转换。
  // 原因：调用方直接使用响应刷新 Store，Mock 必须返回与真实后端相同的嵌套结构。
  it('PUT 完整 Profile patch 后返回同步的中英文字段、测量值、尺码和偏好', async () => {
    setMockScenario('ready-today');

    const updated = await updateProfile({
      shoulder_width_cm: 42,
      waist_cm: 70,
      hip_cm: 94,
      thigh_cm: 54,
      calf_cm: 36,
      leg_length_cm: 84,
      body_type_en: 'standard',
      gender_en: 'male',
      skin_tone_en: 'tan',
      age_range_en: '36_45',
      hair_style_en: 'short',
      hair_color_en: 'brown',
      size_shoes_foot_length_mm: 245,
      style_tags_en: ['minimalist', 'sporty'],
      color_preferences_en: ['Black', 'White'],
    });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      body: {
        shoulder_width_cm: 42,
        waist_cm: 70,
        hip_cm: 94,
        thigh_cm: 54,
        calf_cm: 36,
        leg_length_cm: 84,
        body_type: '标准',
        body_type_en: 'standard',
        gender: '男',
        gender_en: 'male',
        skin_tone: '小麦色',
        skin_tone_en: 'tan',
        age_range: '36–45',
        age_range_en: '36_45',
        hair_style: '短发',
        hair_style_en: 'short',
        hair_color: '棕色',
        hair_color_en: 'brown',
        sizes: { shoes_foot_length_mm: 245 },
      },
      preferences: {
        style_tags: ['简约', '运动'],
        style_tags_en: ['minimalist', 'sporty'],
        color_preferences: ['黑', '白'],
        color_preferences_en: ['Black', 'White'],
      },
      completed: true,
    });
  });

  // CODEX-PHASE-5：覆盖 Profile 三态更新中的显式清空。
  // 原因：`null` 与省略字段含义不同，清空后中英文展示字段也必须保持一致。
  it('PUT null 清空可选字段且同步清空对应展示值', async () => {
    setMockScenario('ready-today');

    const updated = await updateProfile({
      shoulder_width_cm: null,
      gender_en: null,
      size_shoes_foot_length_mm: null,
      style_tags_en: null,
      color_preferences_en: null,
    });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      body: {
        shoulder_width_cm: null,
        gender: null,
        gender_en: null,
        sizes: { shoes_foot_length_mm: null },
      },
      preferences: {
        style_tags: null,
        style_tags_en: null,
        color_preferences: null,
        color_preferences_en: null,
      },
    });
  });

  // CODEX-PHASE-5：覆盖身高体重不可清空且错误请求不得污染运行时 Profile。
  // 原因：真实后端对此返回 40001；Mock 若接受会掩盖保存流程错误。
  it.each(['height_cm', 'weight_kg'] as const)('拒绝把 %s 清空为 null', async (field) => {
    setMockScenario('ready-today');

    const rejected = await updateProfile({ [field]: null });
    const fetched = await getProfile();

    expect(rejected.status).toBe(400);
    expect(rejected.body).toMatchObject({ code: 40001, data: null });
    expect(fetched.body.data).toMatchObject({
      body: { height_cm: 175, weight_kg: 52 },
    });
  });

  // CODEX-PHASE-5：Profile 从未完成变为完成后，认证身份也应读取同一运行时完成度。
  // 原因：页面常在保存后刷新 /auth/me，两个端点不能返回互相矛盾的状态。
  it('补齐身高体重后同步更新 auth/me.profile_completed', async () => {
    setMockScenario('profile-incomplete');

    const loginBefore = await json('/auth/login', { method: 'POST' });
    const updated = await updateProfile({ height_cm: 168, weight_kg: 55 });
    const me = await json('/auth/me');
    const loginAfter = await json('/auth/login', { method: 'POST' });

    expect(loginBefore.body.data).toMatchObject({ profile_completed: false });
    expect(updated.body.data).toMatchObject({ completed: true });
    expect(me.body.data).toMatchObject({ profile_completed: true });
    expect(loginAfter.body.data).toMatchObject({ profile_completed: true });
  });

  // CODEX-PHASE-5：把枚举、数量上限与数值范围错误固定为统一 40001。
  // 原因：Profile Mock 必须在 API 边界拦截无效数据，不能把非法值保存进后续 Store 测试。
  it.each([
    [{ gender_en: 'unknown' }, '非法性别'],
    [{ hair_color_en: 'blue' }, '非法发色'],
    [{ style_tags_en: ['minimalist', 'street', 'japanese', 'sporty'] }, '风格超过 3 个'],
    [{ color_preferences_en: ['Black', 'White', 'Gray', 'Red', 'Blue', 'Green'] }, '颜色超过 5 个'],
    [{ height_cm: 49 }, '身高越界'],
    [{ weight_kg: 301 }, '体重越界'],
    [{ waist_cm: -1 }, '可选测量值非正数'],
  ] as const)('拒绝无效 Profile patch：%s（%s）', async (patch, _caseName) => {
    setMockScenario('ready-today');

    const rejected = await updateProfile(patch);

    expect(rejected.status).toBe(400);
    expect(rejected.body).toMatchObject({ code: 40001, data: null });
  });
});

describe('Mock metadata 契约', () => {
  // CODEX-PHASE-5：补齐文档规定的未知 metadata type 错误。
  // 原因：返回空数组会把“类型拼错”伪装成“当前没有选项”。
  it('未知枚举 type 返回 40001', async () => {
    const response = await json('/metadata/enums?type=does_not_exist');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 40001, data: null });
  });
});

describe('Mock 用户模特与任务契约', () => {
  // CODEX-PHASE-5：覆盖 Profile 回填、请求 override、202 响应、轮询完成和头像更新的完整链路。
  // 原因：后续 Store 需要一条不依赖页面的稳定异步任务路径。
  it('从 Profile 回填模型字段并完成 user_model 任务', async () => {
    setMockScenario('ready-today');

    const created = await json('/users/me/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender: '   ',
        body_type: '',
        height_cm: 0,
        hair_style: 'short',
      }),
    });
    const taskId = String(created.body.data?.task_id);
    const model = await json('/users/me/model');
    const processing = await json(`/tasks/${taskId}`);
    const done = await json(`/tasks/${taskId}`);
    const readyModel = await json('/users/me/model');
    const me = await json('/auth/me');

    expect(created.status).toBe(202);
    expect(created.body.data).toMatchObject({
      task_type: 'user_model',
      status: 'pending',
      stage: 'queued',
    });
    expect(model.body.data).toMatchObject({
      gender: 'female',
      body_type: 'athletic',
      height_cm: 175,
      skin_tone: 'medium',
      age_range: '26_35',
      hair_style: 'short',
      hair_color: 'black',
      status: 'processing',
      task_id: taskId,
    });
    expect(processing.body.data).toMatchObject({
      task_type: 'user_model',
      status: 'processing',
    });
    expect(done.body.data).toMatchObject({
      task_type: 'user_model',
      status: 'done',
      user_model_result: { model_image_url: '/codex-mocks/images/user-model.png' },
    });
    expect(readyModel.body.data).toMatchObject({
      status: 'ready',
      hair_style: 'short',
      avatar_url: '/codex-mocks/images/user-model.png',
    });
    expect(me.body.data).toMatchObject({
      avatar_url: '/codex-mocks/images/user-model.png',
    });
  });

  // CODEX-PHASE-5：覆盖合并后仍缺必填字段与非法枚举的 40001。
  // 原因：创建任务前必须先完成 Profile 回填与校验，失败时不能生成 task_id。
  it('Profile 与请求合并后仍缺 body_type 时拒绝创建模型', async () => {
    setMockScenario('profile-incomplete');

    const response = await json('/users/me/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 40001, data: null });
  });

  // CODEX-PHASE-5：模型任务完成后 auth/me 必须暴露新头像，即使场景初始没有头像。
  // 原因：后续页面与 Store 通过身份接口刷新最终模型图，不能永久受初始场景名称限制。
  it('模型任务完成后把结果头像同步到 auth/me', async () => {
    setMockScenario('profile-incomplete');
    const created = await json('/users/me/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body_type: 'athletic' }),
    });
    const taskId = String(created.body.data?.task_id);

    await json(`/tasks/${taskId}`);
    await json(`/tasks/${taskId}`);
    const me = await json('/auth/me');

    expect(me.body.data).toMatchObject({
      avatar_url: '/codex-mocks/images/user-model.png',
    });
  });

  it.each([{ gender: 'unknown' }, { gender: 123 }] as const)(
    '请求提供非法模型枚举时拒绝创建任务：%s',
    async (requestBody) => {
      setMockScenario('ready-today');

      const response = await json('/users/me/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 40001, data: null });
    },
  );

  // CODEX-PHASE-5：统一现有 Try-on Mock 的通用异步创建响应。
  // 原因：文档规定所有异步 202 响应都包含 `stage=queued`，共享轮询 Store 会依赖该形状。
  it('Try-on 创建响应也包含 queued stage', async () => {
    setMockScenario('ready-today');

    const response = await json('/tryon/outfits/mock-outfit-001', { method: 'POST' });

    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({
      task_type: 'full_tryon',
      status: 'pending',
      stage: 'queued',
    });
  });
});

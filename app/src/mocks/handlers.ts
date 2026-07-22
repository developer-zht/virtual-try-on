import { delay, http, HttpResponse } from 'msw';
import { mockFixtures } from './fixtures';
import { DEFAULT_MOCK_SCENARIO, normalizeMockScenario, type MockScenario } from './scenarios';

type JsonObject = Record<string, unknown>;
type EnumItem = { value: string; label_zh: string; label_en: string };
type EnumCatalog = Record<string, EnumItem[]>;
type RuntimeTask = {
  id: string;
  type: 'full_tryon' | 'user_model';
  polls: number;
  scenario: MockScenario;
  createdAt: string;
};
export type MockWeather = keyof typeof mockFixtures.weatherVariants;

const PROFILE_ENUM_FIELDS = {
  body_type_en: { type: 'body_shape', labelField: 'body_type' },
  gender_en: { type: 'gender', labelField: 'gender' },
  skin_tone_en: { type: 'skin_tone', labelField: 'skin_tone' },
  age_range_en: { type: 'age_range', labelField: 'age_range' },
  hair_style_en: { type: 'hair_style', labelField: 'hair_style' },
  hair_color_en: { type: 'hair_color', labelField: 'hair_color' },
} as const;

const OPTIONAL_MEASUREMENT_FIELDS = [
  'shoulder_width_cm',
  'waist_cm',
  'hip_cm',
  'thigh_cm',
  'calf_cm',
  'leg_length_cm',
] as const;

const SIZE_FIELDS: Record<string, string> = {
  size_tops_cn: 'tops_cn',
  size_bottoms_waist_cn: 'bottoms_waist_cn',
  size_bottoms_length_cn: 'bottoms_length_cn',
  size_shoes_cn: 'shoes_cn',
  size_shoes_foot_length_mm: 'shoes_foot_length_mm',
};

const API = '*/api/v1';
const now = () => new Date().toISOString();

function ok(data?: unknown, status = 200) {
  return HttpResponse.json(
    { code: 0, message: 'ok', ...(data === undefined ? {} : { data }) },
    { status },
  );
}

function fail(code: number, message: string, status: number) {
  return HttpResponse.json({ code, message, data: null }, { status });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function enumCatalog(): EnumCatalog {
  return (mockFixtures.enums.types ?? {}) as EnumCatalog;
}

function findEnumItem(type: string, value: string): EnumItem | undefined {
  return enumCatalog()[type]?.find((item) => item.value === value);
}

function enumValuesAreValid(type: string, values: readonly string[]): boolean {
  const items = enumCatalog()[type];
  return Boolean(items && values.every((value) => items.some((item) => item.value === value)));
}

function localizedValues(type: string, values: readonly string[]): string[] {
  return values.map((value) => findEnumItem(type, value)?.label_zh ?? value);
}

let currentScenario: MockScenario = DEFAULT_MOCK_SCENARIO;
let currentWeather: MockWeather = 'cloudy';
let profileState: JsonObject;
let modelState: JsonObject;
let wardrobeState: JsonObject[];
let todayOutfitState: JsonObject;
let taskSequence = 0;
const tasks = new Map<string, RuntimeTask>();

function resetRuntimeData() {
  profileState = clone(
    currentScenario === 'profile-incomplete'
      ? mockFixtures.incompleteProfile
      : mockFixtures.profile,
  );
  modelState = clone(
    currentScenario === 'profile-incomplete'
      ? mockFixtures.incompleteModel
      : currentScenario === 'model-generating'
        ? mockFixtures.generatingModel
        : mockFixtures.model,
  );
  wardrobeState = clone(currentScenario === 'wardrobe-empty' ? [] : mockFixtures.wardrobe.items);
  todayOutfitState = clone(mockFixtures.todayOutfit);
  taskSequence = 0;
  tasks.clear();
}

resetRuntimeData();

export function setMockScenario(value: unknown): MockScenario {
  currentScenario = normalizeMockScenario(value);
  resetRuntimeData();
  return currentScenario;
}

export function getMockScenario(): MockScenario {
  return currentScenario;
}

export function setMockWeather(value: unknown): MockWeather {
  currentWeather = value === 'sunny' || value === 'rainy' || value === 'cloudy' ? value : 'cloudy';
  return currentWeather;
}

export function resetMockState() {
  currentScenario = DEFAULT_MOCK_SCENARIO;
  currentWeather = 'cloudy';
  resetRuntimeData();
}

function isVisitor() {
  return currentScenario === 'visitor';
}

function requireAuth() {
  return isVisitor() ? fail(40101, '请先登录', 401) : null;
}

function currentUser() {
  // CODEX-PHASE-5：认证身份读取运行时 Profile 完成度和模型头像，而不是固定场景名称。
  // 原因：PUT Profile 与模型任务完成后，/auth/me 必须立即反映同一份更新状态。
  const avatarUrl = typeof modelState.avatar_url === 'string' ? modelState.avatar_url : '';
  return {
    ...clone(mockFixtures.user),
    avatar_url: avatarUrl,
    profile_completed: Boolean(profileState.completed),
    garment_count: wardrobeState.length,
  };
}

function createTask(type: RuntimeTask['type']): RuntimeTask {
  taskSequence += 1;
  const task: RuntimeTask = {
    id: `mock-${type}-task-${String(taskSequence).padStart(3, '0')}`,
    type,
    polls: 0,
    scenario: currentScenario,
    createdAt: now(),
  };
  tasks.set(task.id, task);
  return task;
}

function processingTask(task: RuntimeTask, progress: number) {
  return {
    id: task.id,
    task_type: task.type,
    status: 'processing',
    stage: 'generating',
    progress,
    poll_after_ms: 800,
    created_at: task.createdAt,
  };
}

function taskResponse(task: RuntimeTask) {
  task.polls += 1;

  if (task.type === 'user_model') {
    if (task.polls === 1 || task.scenario === 'model-generating') {
      return processingTask(task, task.scenario === 'model-generating' ? 42 : 65);
    }
    // CODEX-PHASE-5：任务完成时保留本次合并后的模型参数，只更新运行状态与结果头像。
    // 原因：若重置成固定 fixture，请求 override 会在轮询结束后丢失，无法测试 Store 回显。
    modelState = {
      ...modelState,
      status: 'ready',
      task_id: null,
      progress: 100,
      avatar_url: mockFixtures.userModelResult.model_image_url,
      updated_at: now(),
    };
    return {
      id: task.id,
      task_type: task.type,
      status: 'done',
      stage: 'done',
      progress: 100,
      poll_after_ms: 0,
      user_model_result: clone(mockFixtures.userModelResult),
      created_at: task.createdAt,
      completed_at: now(),
    };
  }

  if (task.scenario === 'tryon-loading') {
    const progress = [18, 42, 62, 81][Math.min(task.polls - 1, 3)] ?? 81;
    return processingTask(task, progress);
  }

  if (task.polls === 1) return processingTask(task, 62);

  if (task.scenario === 'tryon-failed') {
    return {
      id: task.id,
      task_type: task.type,
      status: 'failed',
      stage: 'failed',
      progress: 62,
      poll_after_ms: 0,
      error_code: 'tryon_generation_failed',
      error_message: '试穿图生成失败，请重新生成',
      created_at: task.createdAt,
      completed_at: now(),
    };
  }

  return {
    id: task.id,
    task_type: task.type,
    status: 'done',
    stage: 'done',
    progress: 100,
    poll_after_ms: 0,
    tryon_result: clone(mockFixtures.tryOn),
    created_at: task.createdAt,
    completed_at: now(),
  };
}

function validNumber(value: unknown, minimum: number, maximum = Number.POSITIVE_INFINITY) {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

// CODEX-PHASE-5：所有 Profile 校验都在写入运行时状态之前完成。
// 原因：错误请求必须返回 40001 且保持原 Profile 不变，才能可靠测试保存失败后的页面状态。
function validateProfilePatch(patch: JsonObject): string | null {
  if ('height_cm' in patch && !validNumber(patch.height_cm, 50, 250)) {
    return 'height_cm 必须是 50–250 之间的非空数字';
  }
  if ('weight_kg' in patch && !validNumber(patch.weight_kg, 20, 300)) {
    return 'weight_kg 必须是 20–300 之间的非空数字';
  }

  for (const field of OPTIONAL_MEASUREMENT_FIELDS) {
    const value = patch[field];
    if (field in patch && value !== null && !validNumber(value, Number.MIN_VALUE)) {
      return `${field} 必须为 null 或正数`;
    }
  }

  if ('size_shoes_foot_length_mm' in patch) {
    const value = patch.size_shoes_foot_length_mm;
    if (value !== null && (!validNumber(value, 1) || !Number.isInteger(value))) {
      return 'size_shoes_foot_length_mm 必须为 null 或正整数';
    }
  }

  for (const [field, config] of Object.entries(PROFILE_ENUM_FIELDS)) {
    if (!(field in patch)) continue;
    const value = patch[field];
    if (value !== null && (typeof value !== 'string' || !findEnumItem(config.type, value))) {
      return `${field} 不是有效枚举值`;
    }
  }

  const listFields = [
    ['style_tags_en', 'style_tag', 3],
    ['color_preferences_en', 'color', 5],
  ] as const;
  for (const [field, type, maximum] of listFields) {
    if (!(field in patch)) continue;
    const value = patch[field];
    if (
      value !== null &&
      (!Array.isArray(value) ||
        value.length > maximum ||
        !value.every((item) => typeof item === 'string') ||
        !enumValuesAreValid(type, value))
    ) {
      return `${field} 不是有效枚举数组`;
    }
  }

  return null;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function modelText(requestValue: unknown, profileValue: unknown): unknown {
  if (requestValue === undefined || requestValue === null) {
    return nonEmptyText(profileValue);
  }
  if (typeof requestValue === 'string') {
    return requestValue.trim() || nonEmptyText(profileValue);
  }
  return requestValue;
}

// CODEX-PHASE-5：用户模特请求按“非空请求值优先，否则从 Profile 回填”合并。
// 原因：前端可只发送 override，MSW 必须与真实 POST /users/me/model 的合并规则一致。
function mergeUserModelRequest(requestBody: JsonObject): JsonObject {
  const profileBody = (profileState.body ?? {}) as JsonObject;
  const requestedHeight = requestBody.height_cm;

  return {
    gender: modelText(requestBody.gender, profileBody.gender_en),
    body_type: modelText(requestBody.body_type, profileBody.body_type_en),
    height_cm:
      requestedHeight === undefined || requestedHeight === null || requestedHeight === 0
        ? (profileBody.height_cm ?? null)
        : requestedHeight,
    skin_tone: modelText(requestBody.skin_tone, profileBody.skin_tone_en),
    age_range: modelText(requestBody.age_range, profileBody.age_range_en),
    hair_style: modelText(requestBody.hair_style, profileBody.hair_style_en),
    hair_color: modelText(requestBody.hair_color, profileBody.hair_color_en),
    avatar_image_url: nonEmptyText(requestBody.avatar_image_url) ?? '',
    model_name: nonEmptyText(requestBody.model_name) ?? '',
  };
}

function validateUserModelRequest(model: JsonObject): string | null {
  const requiredEnums = [
    ['gender', 'gender'],
    ['body_type', 'body_shape'],
  ] as const;
  const optionalEnums = [
    ['skin_tone', 'skin_tone'],
    ['age_range', 'age_range'],
    ['hair_style', 'hair_style'],
    ['hair_color', 'hair_color'],
  ] as const;

  for (const [field, type] of requiredEnums) {
    const value = model[field];
    if (typeof value !== 'string' || !findEnumItem(type, value)) {
      return `${field} 缺失或不是有效枚举值`;
    }
  }
  for (const [field, type] of optionalEnums) {
    const value = model[field];
    if (
      value !== null &&
      value !== undefined &&
      (typeof value !== 'string' || !findEnumItem(type, value))
    ) {
      return `${field} 不是有效枚举值`;
    }
  }

  const height = model.height_cm;
  if (height !== null && height !== undefined && !validNumber(height, 50, 250)) {
    return 'height_cm 不是有效身高';
  }
  return null;
}

function updateProfile(patch: JsonObject) {
  const body = clone(profileState.body ?? {}) as JsonObject;
  const preferences = clone(profileState.preferences ?? {}) as JsonObject;
  const sizes = clone(body.sizes ?? {}) as JsonObject;

  // CODEX-PHASE-5：数值字段保留三态语义；枚举字段同时维护英文值和中文展示值。
  // 原因：PUT 请求是扁平结构，响应是嵌套且包含中英文双字段，不能只复制请求对象。
  const bodyFields = ['height_cm', 'weight_kg', ...OPTIONAL_MEASUREMENT_FIELDS];
  bodyFields.forEach((field) => {
    if (field in patch) body[field] = patch[field];
  });

  Object.entries(PROFILE_ENUM_FIELDS).forEach(([field, config]) => {
    if (!(field in patch)) return;
    const value = patch[field] as string | null;
    body[field] = value;
    body[config.labelField] = value === null ? null : findEnumItem(config.type, value)?.label_zh;
  });

  Object.entries(SIZE_FIELDS).forEach(([requestField, responseField]) => {
    if (requestField in patch) sizes[responseField] = patch[requestField];
  });
  body.sizes = sizes;

  if ('style_tags_en' in patch) {
    const values = patch.style_tags_en as string[] | null;
    preferences.style_tags_en = values;
    preferences.style_tags = values === null ? null : localizedValues('style_tag', values);
  }
  if ('color_preferences_en' in patch) {
    const values = patch.color_preferences_en as string[] | null;
    preferences.color_preferences_en = values;
    preferences.color_preferences = values === null ? null : localizedValues('color', values);
  }

  // CODEX-PHASE-5：Profile 完成度只依据身高和体重，与生成模特所需的体型等字段解耦。
  // 原因：v1.8.1 明确 `completed/profile_completed` 不要求性别或体型，Mock 必须与后端一致。
  profileState = {
    ...profileState,
    body,
    preferences,
    completed:
      body.height_cm !== null &&
      body.height_cm !== undefined &&
      body.weight_kg !== null &&
      body.weight_kg !== undefined,
    updated_at: now(),
  };
}

export const handlers = [
  http.post(`${API}/auth/login`, () => {
    // CODEX-PHASE-5：登录响应顶层完成度与 user.profile_completed 共用运行时 Profile 状态。
    // 原因：固定 auth fixture 会让 profile-incomplete 场景在登录时错误报告为已完成。
    const user = currentUser();
    return ok({ ...clone(mockFixtures.auth), profile_completed: user.profile_completed, user });
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as JsonObject;
    return ok(
      {
        ...clone(mockFixtures.auth),
        profile_completed: false,
        user: {
          ...currentUser(),
          nickname: typeof body.nickname === 'string' ? body.nickname : '新用户',
          avatar_url: '',
          // CODEX-PHASE-5：注册产生的新身份不继承当前场景用户的 Profile 完成度。
          // 原因：顶层与 user 内的完成度必须同时为 false，避免注册后路由判断不一致。
          profile_completed: false,
        },
      },
      201,
    );
  }),

  http.get(`${API}/auth/me`, () => requireAuth() ?? ok(currentUser())),

  http.get(`${API}/users/me/profile`, () => requireAuth() ?? ok(profileState)),

  http.put(`${API}/users/me/profile`, async ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const patch = (await request.json()) as JsonObject;
    const validationError = validateProfilePatch(patch);
    if (validationError) return fail(40001, validationError, 400);
    updateProfile(patch);
    return ok(profileState);
  }),

  // 这是已商定但当前后端尚未提供的读取契约，用于开发“身体数据”二级页回显。
  http.get(`${API}/users/me/model`, () => requireAuth() ?? ok(modelState)),

  http.post(`${API}/users/me/model`, async ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const body = mergeUserModelRequest((await request.json()) as JsonObject);
    const validationError = validateUserModelRequest(body);
    if (validationError) return fail(40001, validationError, 400);
    const task = createTask('user_model');
    modelState = {
      ...modelState,
      ...body,
      status: 'processing',
      task_id: task.id,
      progress: 0,
      avatar_url: null,
    };
    return ok(
      {
        task_id: task.id,
        task_type: task.type,
        status: 'pending',
        stage: 'queued',
        poll_after_ms: 800,
      },
      202,
    );
  }),

  http.get(`${API}/metadata/enums`, ({ request }) => {
    const type = new URL(request.url).searchParams.get('type');
    const all = clone(mockFixtures.enums);
    const types = all.types as Record<string, unknown>;
    if (!type) return ok(all);
    if (!(type in types)) return fail(40001, `未知枚举类型：${type}`, 400);
    return ok({ type, items: types[type], loaded_at: all.loaded_at });
  }),

  http.get(`${API}/wardrobe`, ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const category = new URL(request.url).searchParams.get('category_en');
    const items = category
      ? wardrobeState.filter((garment) => garment.category_en === category)
      : wardrobeState;
    return ok({
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: items.length,
        has_more: false,
      },
    });
  }),

  http.get(
    `${API}/wardrobe/stats`,
    () =>
      requireAuth() ??
      ok(
        wardrobeState.length === 0
          ? { total: 0, by_category: [] }
          : clone(mockFixtures.wardrobeStats),
      ),
  ),

  http.get(`${API}/weather`, ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const variant = new URL(request.url).searchParams.get('mockWeather') ?? currentWeather;
    if (variant === 'sunny') return ok(clone(mockFixtures.weatherVariants.sunny));
    if (variant === 'rainy') return ok(clone(mockFixtures.weatherVariants.rainy));
    return ok(clone(mockFixtures.weatherVariants.cloudy));
  }),

  http.get(`${API}/user/today-outfit`, () => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    if (
      [
        'profile-incomplete',
        'model-generating',
        'wardrobe-empty',
        'ready-to-generate',
        'recommendation-loading',
      ].includes(currentScenario)
    ) {
      return fail(40401, '今日穿搭未设置', 404);
    }
    return ok(todayOutfitState);
  }),

  http.put(`${API}/user/today-outfit`, async ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const body = (await request.json()) as { outfit_id?: string };
    const next = mockFixtures.recommendation.outfits.find((outfit) => outfit.id === body.outfit_id);
    if (next) todayOutfitState = clone(next);
    return ok({ updated: Boolean(next) });
  }),

  http.post(`${API}/outfits/recommend`, async () => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    if (wardrobeState.length === 0) return fail(40031, '请先添加衣物', 400);
    await delay(currentScenario === 'recommendation-loading' ? 8000 : 600);
    return ok(clone(mockFixtures.recommendation));
  }),

  http.get(`${API}/outfits/:id`, ({ params }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const outfit = mockFixtures.recommendation.outfits.find(({ id }) => id === params.id);
    return outfit ? ok(clone(outfit)) : fail(40402, '穿搭不存在', 404);
  }),

  http.post(`${API}/tryon/outfits/:id`, () => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    if (!currentUser().avatar_url) return fail(40041, '请先完成专属模特设置', 400);
    const task = createTask('full_tryon');
    return ok(
      {
        task_id: task.id,
        task_type: task.type,
        status: 'pending',
        stage: 'queued',
        poll_after_ms: 800,
      },
      202,
    );
  }),

  http.get(`${API}/tasks/:id`, ({ params }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const id = String(params.id);

    if (id === mockFixtures.generatingModel.task_id && currentScenario === 'model-generating') {
      return ok({
        id,
        task_type: 'user_model',
        status: 'processing',
        stage: 'generating',
        progress: 42,
        poll_after_ms: 800,
        created_at: '2026-07-15T19:05:33Z',
      });
    }

    const task = tasks.get(id);
    return task ? ok(taskResponse(task)) : fail(40403, '任务不存在', 404);
  }),

  http.get(
    `${API}/user/outfits`,
    () => requireAuth() ?? ok({ items: [{ ...clone(todayOutfitState), status: 'saved' }] }),
  ),

  http.post(`${API}/user/outfits`, async ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const body = (await request.json()) as JsonObject;
    return ok(
      {
        ...clone(todayOutfitState),
        id: `mock-saved-outfit-${Date.now()}`,
        status: 'saved',
        name: body.name,
        occasion_en: body.occasion_en,
        tags_en: body.tags_en ?? [],
      },
      201,
    );
  }),

  http.delete(`${API}/user/outfits/:id`, () => requireAuth() ?? ok()),
];

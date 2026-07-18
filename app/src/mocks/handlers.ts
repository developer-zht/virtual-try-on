import { delay, http, HttpResponse } from 'msw';
import { mockFixtures } from './fixtures';
import { DEFAULT_MOCK_SCENARIO, normalizeMockScenario, type MockScenario } from './scenarios';

type JsonObject = Record<string, unknown>;
type RuntimeTask = {
  id: string;
  type: 'full_tryon' | 'user_model';
  polls: number;
  scenario: MockScenario;
  createdAt: string;
};
export type MockWeather = keyof typeof mockFixtures.weatherVariants;

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
  const incomplete = currentScenario === 'profile-incomplete';
  const generating = currentScenario === 'model-generating';
  return {
    ...clone(mockFixtures.user),
    avatar_url: incomplete || generating ? '' : mockFixtures.user.avatar_url,
    profile_completed: !incomplete,
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
    modelState = clone(mockFixtures.model);
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

function updateProfile(patch: JsonObject) {
  const body = clone(profileState.body ?? {}) as JsonObject;
  const preferences = clone(profileState.preferences ?? {}) as JsonObject;
  const sizes = clone(body.sizes ?? {}) as JsonObject;

  const bodyFields = [
    'height_cm',
    'weight_kg',
    'shoulder_width_cm',
    'waist_cm',
    'hip_cm',
    'thigh_cm',
    'calf_cm',
    'leg_length_cm',
    'body_type_en',
  ];
  bodyFields.forEach((field) => {
    if (field in patch) body[field] = patch[field];
  });

  const sizeFields: Record<string, string> = {
    size_tops_cn: 'tops_cn',
    size_bottoms_waist_cn: 'bottoms_waist_cn',
    size_bottoms_length_cn: 'bottoms_length_cn',
    size_shoes_cn: 'shoes_cn',
    size_shoes_foot_length_mm: 'shoes_foot_length_mm',
  };
  Object.entries(sizeFields).forEach(([requestField, responseField]) => {
    if (requestField in patch) sizes[responseField] = patch[requestField];
  });
  body.sizes = sizes;

  if ('style_tags_en' in patch) preferences.style_tags_en = patch.style_tags_en;
  if ('color_preferences_en' in patch) {
    preferences.color_preferences_en = patch.color_preferences_en;
  }

  profileState = {
    ...profileState,
    body,
    preferences,
    completed: Boolean(body.height_cm && body.weight_kg && body.body_type_en),
    updated_at: now(),
  };
}

export const handlers = [
  http.post(`${API}/auth/login`, () => ok({ ...clone(mockFixtures.auth), user: currentUser() })),

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
    updateProfile((await request.json()) as JsonObject);
    return ok(profileState);
  }),

  // 这是已商定但当前后端尚未提供的读取契约，用于开发“身体数据”二级页回显。
  http.get(`${API}/users/me/model`, () => requireAuth() ?? ok(modelState)),

  http.post(`${API}/users/me/model`, async ({ request }) => {
    const unauthorized = requireAuth();
    if (unauthorized) return unauthorized;
    const body = (await request.json()) as JsonObject;
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
    return ok({ type, items: types[type] ?? [], loaded_at: all.loaded_at });
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

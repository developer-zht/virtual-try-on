import capturedContract from './real-contract.json';

type JsonObject = Record<string, unknown>;

const captured = capturedContract as unknown as {
  me: { body: { data: JsonObject } };
  profile: { body: { data: JsonObject } };
  enums: { body: { data: JsonObject } };
  wardrobe: { body: { data: { items: JsonObject[]; pagination: JsonObject } } };
  weather: { body: { data: JsonObject } };
  today_outfit: { body: { data: JsonObject } };
  recommendation: { body: { data: { outfits: JsonObject[]; weather: JsonObject } } };
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function localizeGarment(garment: JsonObject, fallback: string): JsonObject {
  const display =
    typeof garment.display_image_url === 'string' &&
    garment.display_image_url.startsWith('/codex-mocks/images/')
      ? garment.display_image_url
      : fallback;
  return {
    ...garment,
    image_url: display,
    cutout_url: garment.cutout_url === null ? null : display,
    display_image_url: display,
  };
}

function localizeOutfit(outfit: JsonObject, index: number): JsonObject {
  const garments = Array.isArray(outfit.garments) ? outfit.garments : [];
  return {
    ...outfit,
    id: index === 0 ? 'mock-outfit-001' : `mock-outfit-00${index + 1}`,
    garments: garments.map((garment, garmentIndex) =>
      localizeGarment(
        garment as JsonObject,
        `/codex-mocks/images/garment-${String(garmentIndex + 1).padStart(2, '0')}.png`,
      ),
    ),
  };
}

const completeProfile = clone(captured.profile.body.data);
// CODEX-PHASE-5：在旧版实采 Profile 上补齐完整测量值与 v1.8.1 外观中英文字段。
// 原因：默认 Mock 必须为读取、回显、保存和 Store 映射提供一份稳定的完整身体数据基线。
completeProfile.body = {
  ...(completeProfile.body as JsonObject),
  shoulder_width_cm: 38,
  waist_cm: 66,
  hip_cm: 90,
  thigh_cm: 50,
  calf_cm: 34,
  leg_length_cm: 82,
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
  sizes: {
    ...(((completeProfile.body as JsonObject).sizes as JsonObject) ?? {}),
    shoes_foot_length_mm: 235,
  },
};
const incompleteProfile = clone(completeProfile);
incompleteProfile.completed = false;
incompleteProfile.body = {
  ...(completeProfile.body as JsonObject),
  height_cm: null,
  weight_kg: null,
  body_type: null,
  body_type_en: null,
};

const user = {
  ...clone(captured.me.body.data),
  id: 'mock-user-001',
  email: 'mock.user@example.com',
  nickname: 'Luna',
  avatar_url: '/codex-mocks/images/user-model.png',
};

const wardrobeItems = captured.wardrobe.body.data.items.map((garment, index) =>
  localizeGarment(
    clone(garment),
    `/codex-mocks/images/garment-${String(index + 1).padStart(2, '0')}.png`,
  ),
);

const recommendationOutfits = captured.recommendation.body.data.outfits.map((outfit, index) =>
  localizeOutfit(clone(outfit), index),
);

const todayOutfit = localizeOutfit(clone(captured.today_outfit.body.data), 0);

export const mockFixtures = {
  auth: {
    access_token: 'mock-access-token',
    expires_in: 86_400,
    profile_completed: true,
    user,
  },
  user,
  profile: completeProfile,
  incompleteProfile,
  // CODEX-PHASE-5：模型 fixture 保留全部可由 Profile 回填的字段。
  // 原因：POST Model 的 override 与轮询完成后回显不能只覆盖旧版五字段。
  model: {
    status: 'ready',
    task_id: null,
    progress: 100,
    gender: 'female',
    body_type: 'athletic',
    height_cm: 175,
    weight_kg: 52,
    skin_tone: 'medium',
    age_range: '26_35',
    hair_style: 'long',
    hair_color: 'black',
    avatar_url: '/codex-mocks/images/user-model.png',
    updated_at: '2026-07-15T19:05:33Z',
  },
  incompleteModel: {
    status: 'incomplete',
    task_id: null,
    progress: 0,
    gender: null,
    body_type: null,
    height_cm: null,
    weight_kg: null,
    skin_tone: null,
    age_range: null,
    hair_style: null,
    hair_color: null,
    avatar_url: null,
    updated_at: null,
  },
  generatingModel: {
    status: 'processing',
    task_id: 'mock-model-task-001',
    progress: 42,
    gender: 'female',
    body_type: 'athletic',
    height_cm: 175,
    weight_kg: 52,
    skin_tone: 'medium',
    age_range: '26_35',
    hair_style: 'long',
    hair_color: 'black',
    avatar_url: null,
    updated_at: null,
  },
  enums: clone(captured.enums.body.data),
  wardrobe: {
    items: wardrobeItems,
    pagination: {
      ...clone(captured.wardrobe.body.data.pagination),
      total: wardrobeItems.length,
    },
  },
  wardrobeStats: {
    total: wardrobeItems.length,
    by_category: Object.values(
      wardrobeItems.reduce<
        Record<string, { category: unknown; category_en: unknown; count: number }>
      >((groups, garment) => {
        const key = String(garment.category_en);
        const existing = groups[key];
        if (existing) existing.count += 1;
        else {
          groups[key] = {
            category: garment.category,
            category_en: garment.category_en,
            count: 1,
          };
        }
        return groups;
      }, {}),
    ),
  },
  weather: clone(captured.weather.body.data),
  weatherVariants: {
    sunny: {
      ...clone(captured.weather.body.data),
      temp: 29,
      feels_like: 31,
      condition: '晴',
      condition_en: 'Sunny',
      humidity: 43,
    },
    cloudy: clone(captured.weather.body.data),
    rainy: {
      ...clone(captured.weather.body.data),
      temp: 22,
      feels_like: 23,
      condition: '中雨',
      condition_en: 'Moderate Rain',
      humidity: 92,
    },
  },
  recommendation: {
    outfits: recommendationOutfits,
    weather: clone(captured.recommendation.body.data.weather),
  },
  todayOutfit,
  tryOn: {
    id: 'mock-tryon-result-001',
    image_url: '/codex-mocks/images/tryon-success.png',
  },
  userModelResult: {
    model_image_url: '/codex-mocks/images/user-model.png',
    generation_mode: 'virtual',
  },
} as const;

export function collectLocalImageUrls(value: unknown): string[] {
  const urls = new Set<string>();

  function visit(current: unknown, key = '') {
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item));
      return;
    }
    if (current && typeof current === 'object') {
      Object.entries(current).forEach(([childKey, child]) => visit(child, childKey));
      return;
    }
    if (typeof current === 'string' && /_url$/i.test(key)) urls.add(current);
  }

  visit(value);
  return [...urls];
}

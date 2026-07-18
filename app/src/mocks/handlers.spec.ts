import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, resetMockState, setMockScenario, setMockWeather } from './handlers';
import { collectLocalImageUrls, mockFixtures } from './fixtures';
import { normalizeMockScenario } from './scenarios';

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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => server.close());

describe('mock scenario selection', () => {
  it('falls back to ready-today for an unknown scenario', () => {
    expect(normalizeMockScenario('does-not-exist')).toBe('ready-today');
  });

  it('keeps every documented scenario selectable', () => {
    const scenarios = [
      'visitor',
      'profile-incomplete',
      'model-generating',
      'wardrobe-empty',
      'ready-to-generate',
      'recommendation-loading',
      'tryon-loading',
      'tryon-failed',
      'ready-today',
    ] as const;

    expect(scenarios.map(normalizeMockScenario)).toEqual(scenarios);
  });
});

describe('real-contract fixtures', () => {
  it('uses only stable local image URLs', () => {
    const urls = collectLocalImageUrls(mockFixtures);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith('/codex-mocks/images/'))).toBe(true);
    expect(urls.some((url) => /^https?:\/\//.test(url))).toBe(false);
  });

  it('preserves the real recommendation garment shape', () => {
    const garments = mockFixtures.recommendation.outfits[0]?.garments as
      Array<Record<string, unknown>> | undefined;
    const garment = garments?.[0];
    expect(garment).toMatchObject({
      id: expect.any(String),
      category: expect.any(String),
      category_en: expect.any(String),
      image_url: expect.any(String),
      display_image_url: expect.any(String),
    });
  });
});

describe('MSW handlers', () => {
  it('matches the absolute production API URL', async () => {
    setMockScenario('ready-today');
    const response = await json('/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data).toMatchObject({
      id: 'mock-user-001',
      avatar_url: '/codex-mocks/images/user-model.png',
    });
  });

  it('returns a 401 identity response for visitors', async () => {
    setMockScenario('visitor');
    const response = await json('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.code).not.toBe(0);
    expect(response.body.data).toBeNull();
  });

  it('returns incomplete required profile data in profile-incomplete', async () => {
    setMockScenario('profile-incomplete');
    const response = await json('/users/me/profile');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      completed: false,
      body: {
        height_cm: null,
        weight_kg: null,
        body_type_en: null,
      },
    });
  });

  it('switches weather independently from the business scenario', async () => {
    setMockScenario('ready-today');
    setMockWeather('rainy');
    const response = await json('/weather');

    expect(response.body.data).toMatchObject({
      condition: '中雨',
      condition_en: 'Moderate Rain',
    });
  });

  it('advances a try-on task from processing to done', async () => {
    setMockScenario('ready-today');
    const created = await json('/tryon/outfits/mock-outfit-001', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preserve_face: true }),
    });
    const taskId = String(created.body.data?.task_id);

    const firstPoll = await json(`/tasks/${taskId}`);
    const secondPoll = await json(`/tasks/${taskId}`);

    expect(firstPoll.body.data).toMatchObject({ status: 'processing', progress: 62 });
    expect(secondPoll.body.data).toMatchObject({
      status: 'done',
      progress: 100,
      tryon_result: { image_url: '/codex-mocks/images/tryon-success.png' },
    });
  });

  it('returns the retryable failure shape for tryon-failed', async () => {
    setMockScenario('tryon-failed');
    const created = await json('/tryon/outfits/mock-outfit-001', { method: 'POST' });
    const taskId = String(created.body.data?.task_id);

    await json(`/tasks/${taskId}`);
    const failed = await json(`/tasks/${taskId}`);

    expect(failed.body.data).toMatchObject({
      status: 'failed',
      stage: 'failed',
      error_code: 'tryon_generation_failed',
      error_message: '试穿图生成失败，请重新生成',
    });
  });
});

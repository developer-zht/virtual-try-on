import { describe, expect, it } from 'vitest';
import {
  buildHomeGuideView,
  resolveHomeGuideStage,
  type HomeGuideFacts,
  type HomeGuideStage,
} from '../../homeGuideFlow';

function facts(overrides: Partial<HomeGuideFacts> = {}): HomeGuideFacts {
  return {
    loggedIn: true,
    modelStatus: 'ready',
    modelProgress: 100,
    hasClothes: true,
    ...overrides,
  };
}

function build(overrides: Partial<HomeGuideFacts> = {}) {
  return buildHomeGuideView(facts(overrides));
}

describe('resolveHomeGuideStage', () => {
  it.each<{
    name: string;
    input: HomeGuideFacts;
    expected: HomeGuideStage;
  }>([
    {
      name: '未登录',
      input: facts({ loggedIn: false, modelStatus: 'missing', hasClothes: false }),
      expected: 'need-login',
    },
    {
      name: '已登录但缺少专属模特',
      input: facts({ modelStatus: 'missing' }),
      expected: 'need-model',
    },
    {
      name: '专属模特生成中且衣柜为空',
      input: facts({ modelStatus: 'generating', hasClothes: false }),
      expected: 'model-generating-need-clothes',
    },
    {
      name: '专属模特生成中且已有衣物',
      input: facts({ modelStatus: 'generating', hasClothes: true }),
      expected: 'model-generating',
    },
    {
      name: '专属模特完成但衣柜为空',
      input: facts({ hasClothes: false }),
      expected: 'need-clothes',
    },
    {
      name: '专属模特和衣柜都准备完成',
      input: facts(),
      expected: 'ready',
    },
  ])('$name -> $expected', ({ input, expected }) => {
    expect(resolveHomeGuideStage(input)).toBe(expected);
  });

  it('始终让登录状态拥有最高产品优先级', () => {
    expect(
      resolveHomeGuideStage(facts({ loggedIn: false, modelStatus: 'ready', hasClothes: true })),
    ).toBe('need-login');
  });
});

describe('buildHomeGuideView', () => {
  it.each([
    ['need-login', facts({ loggedIn: false }), '注册 / 登录', 'login'],
    ['need-model', facts({ modelStatus: 'missing' }), '创建专属模特', 'create-model'],
    [
      'model-generating-need-clothes',
      facts({ modelStatus: 'generating', modelProgress: 42, hasClothes: false }),
      '添加第一件衣物',
      'open-wardrobe',
    ],
    [
      'model-generating',
      facts({ modelStatus: 'generating', modelProgress: 42, hasClothes: true }),
      '专属模特生成中 42%',
      null,
    ],
    ['need-clothes', facts({ hasClothes: false }), '添加第一件衣物', 'open-wardrobe'],
    ['ready', facts(), '生成我的虚拟试穿', 'generate-tryon'],
  ] as const)('为 %s 阶段提供与产品表一致的主按钮', (stage, input, label, action) => {
    const view = buildHomeGuideView(input);

    expect(view.stage).toBe(stage);
    expect(view.primary).toEqual({ label, action });
  });

  it.each([
    [-4, 0],
    [42.6, 43],
    [140, 100],
  ])('将模特进度 %s 限制并取整为 %s', (input, expected) => {
    expect(build({ modelStatus: 'generating', modelProgress: input }).modelProgress).toBe(expected);
  });

  it('未登录时只允许从账号步骤登录', () => {
    const view = build({ loggedIn: false, modelStatus: 'missing', hasClothes: false });

    expect(view.steps).toEqual([
      {
        key: 'account',
        order: 1,
        label: '注册 / 登录',
        state: 'current',
        statusText: '未开始',
        action: 'login',
      },
      {
        key: 'model',
        order: 2,
        label: '创建专属模特',
        state: 'waiting',
        statusText: '待完成',
        action: null,
      },
      {
        key: 'wardrobe',
        order: 3,
        label: '添加第一件衣物',
        state: 'waiting',
        statusText: '待完成',
        action: null,
      },
    ]);
  });

  it('模特缺失时突出模特步骤，同时允许用户提前进入空衣柜', () => {
    const view = build({ modelStatus: 'missing', hasClothes: false });

    expect(view.steps[0]).toMatchObject({ state: 'done', action: null });
    expect(view.steps[1]).toMatchObject({
      state: 'current',
      statusText: '待完成',
      action: 'create-model',
    });
    expect(view.steps[2]).toMatchObject({
      state: 'waiting',
      statusText: '待完成',
      action: 'open-wardrobe',
    });
  });

  it('模特缺失时仍如实显示已经完成的衣柜步骤', () => {
    const wardrobeStep = build({ modelStatus: 'missing', hasClothes: true }).steps[2];

    expect(wardrobeStep).toMatchObject({
      state: 'done',
      statusText: '已完成',
      action: null,
    });
  });

  it('模特生成中只展示进度，并让空衣柜成为当前可执行步骤', () => {
    const view = build({ modelStatus: 'generating', modelProgress: 42, hasClothes: false });

    expect(view.steps[1]).toMatchObject({
      state: 'progress',
      statusText: '生成中 42%',
      action: null,
    });
    expect(view.steps[2]).toMatchObject({
      state: 'current',
      action: 'open-wardrobe',
    });
  });

  it('全部准备完成后仅主按钮可以开始 Try-on 流程', () => {
    const view = build();

    expect(view.steps.every((step) => step.state === 'done')).toBe(true);
    expect(view.steps.every((step) => step.action === null)).toBe(true);
    expect(view.primary.action).toBe('generate-tryon');
  });

  it('使用 null 表示不可执行状态，不再暴露虚构的 wait 动作', () => {
    const view = build({ modelStatus: 'generating', modelProgress: 42 });

    expect(view.primary.action).toBeNull();
    expect(JSON.stringify(view)).not.toContain('wait');
  });
});

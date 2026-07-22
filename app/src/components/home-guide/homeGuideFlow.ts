export type HomeModelStatus = 'missing' | 'generating' | 'ready';

/**
 * 首页引导判断所需的真实事实。
 *
 * 这里只记录“现在发生了什么”，不在这里决定显示什么文案。
 */
export interface HomeGuideFacts {
  /** 用户是否已经登录 */
  loggedIn: boolean;

  /** 专属模特当前状态 */
  modelStatus: HomeModelStatus;

  /** 专属模特生成进度，仅 generating 状态使用 */
  modelProgress: number;

  /** 衣柜中是否至少存在一件衣物 */
  hasClothes: boolean;
}

// ============================================================

export type HomeGuideStepState = 'waiting' | 'current' | 'progress' | 'done';

export type HomeGuideAction = 'login' | 'create-model' | 'open-wardrobe' | 'generate-tryon';

export interface HomeGuideStep {
  key: 'account' | 'model' | 'wardrobe';
  order: number;
  label: string;
  state: HomeGuideStepState;
  statusText: string;
  action: HomeGuideAction | null;
}

export type HomeGuideStage =
  | 'need-login'
  | 'need-model'
  | 'model-generating-need-clothes'
  | 'model-generating'
  | 'need-clothes'
  | 'ready';

export interface HomeGuideView {
  stage: HomeGuideStage;
  title: string;
  description: string;
  modelProgress: number;
  steps: HomeGuideStep[];
  primary: {
    label: string;
    action: HomeGuideAction | null;
  };
}

interface HomeGuideStageRule {
  primaryLabel: string;
  primaryAction: HomeGuideAction | null;
}

/**
 * 产品阶段与主按钮的唯一对应表。
 *
 * 修改产品文案或动作时，只需要查看这张表。
 * action 为 null 表示按钮只展示状态，不允许点击。
 *
 * ``` text
 * HomeGuideStage
 *  ├─ primaryLabel：按钮文字
 *  └─ primaryAction：点击动作
 * ```
 *
 */
export const HOME_GUIDE_RULES: Record<HomeGuideStage, HomeGuideStageRule> = {
  'need-login': {
    primaryLabel: '注册 / 登录',
    primaryAction: 'login',
  },
  'need-model': {
    primaryLabel: '创建专属模特',
    primaryAction: 'create-model',
  },
  'model-generating-need-clothes': {
    primaryLabel: '添加第一件衣物',
    primaryAction: 'open-wardrobe',
  },
  'model-generating': {
    primaryLabel: '专属模特生成中',
    primaryAction: null,
  },
  'need-clothes': {
    primaryLabel: '添加第一件衣物',
    primaryAction: 'open-wardrobe',
  },
  ready: {
    primaryLabel: '生成我的虚拟试穿',
    primaryAction: 'generate-tryon',
  },
};

/**
 * 将多个 store 事实转换成一个明确的产品阶段。
 *
 * 判断顺序就是产品优先级：
 * 登录 → 专属模特 → 衣柜 → 开始生成。
 */
export function resolveHomeGuideStage(facts: HomeGuideFacts): HomeGuideStage {
  if (!facts.loggedIn) return 'need-login';
  if (facts.modelStatus === 'missing') return 'need-model';

  if (facts.modelStatus === 'generating') {
    return facts.hasClothes ? 'model-generating' : 'model-generating-need-clothes';
  }

  if (!facts.hasClothes) return 'need-clothes';
  return 'ready';
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildAccountStep(facts: HomeGuideFacts): HomeGuideStep {
  if (!facts.loggedIn)
    return {
      key: 'account',
      order: 1,
      label: '注册 / 登录',
      state: 'current',
      statusText: '未开始',
      action: 'login',
    };

  return {
    key: 'account',
    order: 1,
    label: '注册 / 登录',
    state: 'done',
    statusText: '已完成',
    action: null,
  };
}

function buildModelStep(facts: HomeGuideFacts, progress: number): HomeGuideStep {
  const base = {
    key: 'model' as const,
    order: 2,
    label: '创建专属模特',
  };

  if (!facts.loggedIn)
    return {
      ...base,
      state: 'waiting',
      statusText: '待完成',
      action: null,
    };

  if (facts.modelStatus === 'missing')
    return {
      ...base,
      state: 'current',
      statusText: '待完成',
      action: 'create-model',
    };

  if (facts.modelStatus === 'generating')
    return {
      ...base,
      state: 'progress',
      statusText: `生成中 ${progress}%`,
      action: null,
    };

  return {
    ...base,
    state: 'done',
    statusText: '已完成',
    action: null,
  };
}

function buildWardrobeStep(facts: HomeGuideFacts): HomeGuideStep {
  const base = {
    key: 'wardrobe' as const,
    order: 3,
    label: '添加第一件衣物',
  };

  if (!facts.loggedIn)
    return {
      ...base,
      state: 'waiting',
      statusText: '待完成',
      action: null,
    };

  if (facts.hasClothes) {
    return {
      ...base,
      state: 'done',
      statusText: '已完成',
      action: null,
    };
  }

  return {
    ...base,
    // 缺少模特时可以提前管理衣柜，但它不是当前最推荐的下一步。
    state: facts.modelStatus === 'missing' ? 'waiting' : 'current',
    statusText: '待完成',
    action: 'open-wardrobe',
  };
}

function buildPrimary(stage: HomeGuideStage, progress: number): HomeGuideView['primary'] {
  const rule = HOME_GUIDE_RULES[stage];

  return {
    label: stage === 'model-generating' ? `${rule.primaryLabel} ${progress}%` : rule.primaryLabel,
    action: rule.primaryAction,
  };
}

export function buildHomeGuideView(facts: HomeGuideFacts): HomeGuideView {
  const modelProgress = clampProgress(facts.modelProgress);
  const stage = resolveHomeGuideStage(facts);

  return {
    stage,
    title: '三步准备好你的专属穿搭空间',
    description: '第一次生成，就直接看到你的虚拟试穿效果。',
    modelProgress,
    steps: [
      buildAccountStep(facts),
      buildModelStep(facts, modelProgress),
      buildWardrobeStep(facts),
    ],
    primary: buildPrimary(stage, modelProgress),
  };
}

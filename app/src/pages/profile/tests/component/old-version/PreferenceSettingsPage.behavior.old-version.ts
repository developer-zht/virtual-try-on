/**
 * 测试类型：Vue 组件行为集成测试。
 * 测试对象/范围：PreferenceSettingsPage 在 Profile 或 metadata 读取失败时的真实 setup、onMounted 与条件渲染结果。
 * 隔离内容：使用 Vue 内存渲染器，不创建浏览器 DOM；隔离 Router、Profile/收藏 Store、metadata 和全局通知，不连接真实 Backend。
 */
import { createRenderer, defineComponent, h, nextTick, ref, type App } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileState } from '../../../../../stores/types/profile';

interface HostNode {
  type: string;
  text: string;
  children: HostNode[];
  parent: HostNode | null;
  props: Record<string, unknown>;
}

function createHostNode(type: string, text = ''): HostNode {
  return {
    type,
    text,
    children: [],
    parent: null,
    props: {},
  };
}

function insertNode(child: HostNode, parent: HostNode, anchor: HostNode | null): void {
  child.parent = parent;
  const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1;
  if (anchorIndex >= 0) parent.children.splice(anchorIndex, 0, child);
  else parent.children.push(child);
}

const renderer = createRenderer<HostNode, HostNode>({
  patchProp(element, key, _previousValue, nextValue) {
    element.props[key] = nextValue;
  },
  insert: insertNode,
  remove(child) {
    if (!child.parent) return;
    const index = child.parent.children.indexOf(child);
    if (index >= 0) child.parent.children.splice(index, 1);
    child.parent = null;
  },
  createElement(type) {
    return createHostNode(type);
  },
  createText(text) {
    return createHostNode('#text', text);
  },
  createComment(text) {
    return createHostNode('#comment', text);
  },
  setText(node, text) {
    node.text = text;
  },
  setElementText(element, text) {
    const child = createHostNode('#text', text);
    child.parent = element;
    element.children = [child];
  },
  parentNode(node) {
    return node.parent;
  },
  nextSibling(node) {
    if (!node.parent) return null;
    const index = node.parent.children.indexOf(node);
    return node.parent.children[index + 1] ?? null;
  },
  querySelector() {
    return null;
  },
  setScopeId() {},
  insertStaticContent(content, parent, anchor) {
    const node = createHostNode('#static', content);
    insertNode(node, parent, anchor);
    return [node, node];
  },
});

function textContent(node: HostNode): string {
  return `${node.text}${node.children.map(textContent).join('')}`;
}

function confirmedProfile(): ProfileState {
  return {
    height: 168,
    weight: 52,
    gender: 'female',
    skinTone: 'medium',
    bodyType: 'hourglass',
    ageRange: '26_35',
    hairStyle: 'long',
    hairColor: 'black',
    shoulderWidth: 38,
    waist: 66,
    hip: 91,
    thigh: 52,
    calf: 34,
    legLength: 96,
    footLength: 235,
    styles: ['Minimalist'],
    colors: ['Black'],
    genModel: null,
    vlModel: null,
  };
}

async function flushMountedWork(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

type FailedDependency = 'profile' | 'metadata';

async function renderFailureState(failedDependency: FailedDependency): Promise<string> {
  vi.resetModules();

  const enumLoaded = ref(false);
  const enums = {
    loaded: enumLoaded,
    ensureLoaded: vi.fn(() => {
      if (failedDependency !== 'metadata') enumLoaded.value = true;
      return Promise.resolve();
    }),
    get: vi.fn((type: string) =>
      type === 'style_tag'
        ? [{ value: 'Minimalist', label_zh: '简约', label_en: 'Minimalist' }]
        : [{ value: 'Black', label_zh: '黑色', label_en: 'Black' }],
    ),
  };
  const profileStore = {
    profile: confirmedProfile(),
    error: null as string | null,
    fetchProfile: vi.fn(() => {
      if (failedDependency === 'profile') profileStore.error = 'Profile 读取失败';
      return Promise.resolve();
    }),
    saveProfile: vi.fn(() => Promise.resolve(false)),
  };

  vi.doMock('@/components/PageHeader.vue', () => ({
    default: defineComponent({
      name: 'PageHeaderStub',
      props: {
        title: { type: String, required: true },
      },
      setup(props, { slots }) {
        return () => h('header', [h('h1', props.title), slots.action?.()]);
      },
    }),
  }));
  vi.doMock('@/composables/useEnums', () => ({ useEnums: () => enums }));
  vi.doMock('@/stores/auth', () => ({
    useAuthStore: () => ({
      loggedIn: true,
      openAuth: vi.fn(),
    }),
  }));
  vi.doMock('@/stores/decisionDialog', () => ({
    useDecisionDialogStore: () => ({
      choose: vi.fn(),
    }),
  }));
  vi.doMock('@/stores/notify', () => ({
    useNotifyStore: () => ({
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    }),
  }));
  vi.doMock('@/stores/profile', () => ({ useProfileStore: () => profileStore }));
  vi.doMock('@/stores/savedOutfits', () => ({
    useSavedOutfitsStore: () => ({
      items: [],
      fetchSaved: vi.fn(() => Promise.resolve()),
    }),
  }));
  vi.doMock('vue-router', () => ({
    useRoute: () => ({ query: {} }),
    useRouter: () => ({
      replace: vi.fn(),
      back: vi.fn(),
    }),
    onBeforeRouteLeave: vi.fn(),
  }));

  try {
    const { default: PreferenceSettingsPage } = await import('../../PreferenceSettingsPage.vue');
    const root = createHostNode('root');
    const app: App<HostNode> = renderer.createApp(PreferenceSettingsPage);

    app.mount(root);
    await flushMountedWork();
    try {
      return textContent(root);
    } finally {
      app.unmount();
    }
  } finally {
    vi.doUnmock('@/components/PageHeader.vue');
    vi.doUnmock('@/composables/useEnums');
    vi.doUnmock('@/stores/auth');
    vi.doUnmock('@/stores/decisionDialog');
    vi.doUnmock('@/stores/notify');
    vi.doUnmock('@/stores/profile');
    vi.doUnmock('@/stores/savedOutfits');
    vi.doUnmock('vue-router');
  }
}

function expectOnlyFailureUi(renderedText: string): void {
  expect(renderedText).toContain('偏好读取失败');
  expect(renderedText).toContain('重新加载');
  expect(renderedText).not.toContain('喜欢风格');
  expect(renderedText).not.toContain('喜欢颜色');
  expect(renderedText).not.toContain('简约');
  expect(renderedText).not.toContain('黑色');
}

describe('PreferenceSettingsPage 关键数据读取失败', () => {
  it('Profile 读取失败时显示失败操作，并且不渲染风格和颜色编辑区', async () => {
    expectOnlyFailureUi(await renderFailureState('profile'));
  });

  it('metadata 读取失败时显示失败操作，并且不渲染风格和颜色编辑区', async () => {
    expectOnlyFailureUi(await renderFailureState('metadata'));
  });
});

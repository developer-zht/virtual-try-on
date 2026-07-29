/**
 * 测试类型：Vue 组件行为集成测试。
 * 测试对象/范围：PreferenceSettingsPage 返回按钮在有未保存草稿时对 stay、discard、save 三种决定的处理。
 * 隔离内容：使用 Vue 内存渲染器，不创建浏览器 DOM；隔离 Router、Profile/收藏 Store、metadata、Decision Dialog 和全局通知，不连接真实 Backend。
 */
import { createRenderer, defineComponent, h, nextTick, ref, type App } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileState } from '../../../../../stores/types/profile';

interface HostNode {
  type: string;
  text: string;
  children: HostNode[];
  parent: HostNode | null;
  props: Record<string, unknown>;
}

type LeaveChoice = 'stay' | 'discard' | 'save';

interface MountedBackScenario {
  app: App<HostNode>;
  root: HostNode;
  choose: ReturnType<typeof vi.fn>;
  routerBack: ReturnType<typeof vi.fn>;
  saveProfile: ReturnType<typeof vi.fn>;
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

function findButton(root: HostNode, label: string): HostNode {
  if (root.type === 'button' && textContent(root).trim() === label) return root;

  for (const child of root.children) {
    try {
      return findButton(child, label);
    } catch {
      // 继续查找下一个子树。
    }
  }

  throw new Error(`找不到按钮：${label}`);
}

async function click(node: HostNode): Promise<void> {
  const handler = node.props.onClick;
  if (typeof handler !== 'function') throw new Error(`节点 ${node.type} 没有 onClick`);
  handler();
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
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

async function mountDirtyPage(
  choice: LeaveChoice,
  saveSucceeds = true,
): Promise<MountedBackScenario> {
  vi.resetModules();

  const enumLoaded = ref(false);
  const enums = {
    loaded: enumLoaded,
    ensureLoaded: vi.fn(() => {
      enumLoaded.value = true;
      return Promise.resolve();
    }),
    get: vi.fn((type: string) =>
      type === 'style_tag'
        ? [
            { value: 'Minimalist', label_zh: '简约', label_en: 'Minimalist' },
            { value: 'Sporty', label_zh: '运动', label_en: 'Sporty' },
          ]
        : [{ value: 'Black', label_zh: '黑色', label_en: 'Black' }],
    ),
  };
  const choose = vi.fn(() => Promise.resolve(choice));
  const routerBack = vi.fn();
  const profileStore: {
    profile: ProfileState;
    error: string | null;
    fetchProfile: ReturnType<typeof vi.fn>;
    saveProfile: ReturnType<typeof vi.fn>;
  } = {
    profile: confirmedProfile(),
    error: null,
    fetchProfile: vi.fn(() => Promise.resolve()),
    saveProfile: vi.fn((nextProfile: ProfileState) => {
      if (!saveSucceeds) {
        profileStore.error = '保存失败';
        return Promise.resolve(false);
      }

      profileStore.profile = nextProfile;
      return Promise.resolve(true);
    }),
  };

  vi.doMock('@/components/PageHeader.vue', () => ({
    default: defineComponent({
      name: 'PageHeaderStub',
      emits: ['back'],
      props: {
        title: { type: String, required: true },
      },
      setup(props, { emit, slots }) {
        return () =>
          h('header', [
            h('button', { type: 'button', onClick: () => emit('back') }, '返回'),
            h('h1', props.title),
            slots.action?.(),
          ]);
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
    useDecisionDialogStore: () => ({ choose }),
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
      back: routerBack,
    }),
    onBeforeRouteLeave: vi.fn(),
  }));

  const { default: PreferenceSettingsPage } = await import('../../PreferenceSettingsPage.vue');
  const root = createHostNode('root');
  const app: App<HostNode> = renderer.createApp(PreferenceSettingsPage);

  app.mount(root);
  await flushMountedWork();
  await click(findButton(root, '运动'));

  return {
    app,
    root,
    choose,
    routerBack,
    saveProfile: profileStore.saveProfile,
  };
}

function clearPageMocks(): void {
  vi.doUnmock('@/components/PageHeader.vue');
  vi.doUnmock('@/composables/useEnums');
  vi.doUnmock('@/stores/auth');
  vi.doUnmock('@/stores/decisionDialog');
  vi.doUnmock('@/stores/notify');
  vi.doUnmock('@/stores/profile');
  vi.doUnmock('@/stores/savedOutfits');
  vi.doUnmock('vue-router');
}

let mountedApp: App<HostNode> | null = null;

afterEach(() => {
  mountedApp?.unmount();
  mountedApp = null;
  clearPageMocks();
});

describe('PreferenceSettingsPage 返回按钮离页决定', () => {
  it('选择继续编辑时保留草稿并且不返回', async () => {
    const scenario = await mountDirtyPage('stay');
    mountedApp = scenario.app;

    await click(findButton(scenario.root, '返回'));

    expect(scenario.choose).toHaveBeenCalledOnce();
    expect(scenario.routerBack).not.toHaveBeenCalled();
    expect(findButton(scenario.root, '运动').props['aria-pressed']).toBe(true);
  });

  it('选择放弃修改时恢复初始草稿，然后返回', async () => {
    const scenario = await mountDirtyPage('discard');
    mountedApp = scenario.app;

    await click(findButton(scenario.root, '返回'));

    expect(scenario.routerBack).toHaveBeenCalledOnce();
    expect(findButton(scenario.root, '运动').props['aria-pressed']).toBe(false);
  });

  it('选择保存并离开且保存成功时，先保存完整候选 Profile，再返回', async () => {
    const scenario = await mountDirtyPage('save');
    mountedApp = scenario.app;

    await click(findButton(scenario.root, '返回'));

    expect(scenario.saveProfile).toHaveBeenCalledOnce();
    expect(scenario.saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        styles: ['Minimalist', 'Sporty'],
        colors: ['Black'],
      }),
    );
    expect(scenario.routerBack).toHaveBeenCalledOnce();
  });

  it('选择保存并离开但保存失败时，保留当前草稿并且不返回', async () => {
    const scenario = await mountDirtyPage('save', false);
    mountedApp = scenario.app;

    await click(findButton(scenario.root, '返回'));

    expect(scenario.saveProfile).toHaveBeenCalledOnce();
    expect(scenario.routerBack).not.toHaveBeenCalled();
    expect(findButton(scenario.root, '运动').props['aria-pressed']).toBe(true);
  });
});

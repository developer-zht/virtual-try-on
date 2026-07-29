/**
 * 测试类型：Vue Test Utils 组件 UI 行为测试。
 * 测试对象/范围：PreferenceSettingsPage 在 Profile 或 metadata 读取失败后的可见状态。
 * 隔离内容：隔离 Router、Profile/收藏 Store、metadata、通知和 PageHeader；不连接真实 Backend，不测试跨页面浏览器流程。
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileState } from '../../../../stores/types/profile';

type FailedDependency = 'profile' | 'metadata';

const PageHeaderStub = defineComponent({
  name: 'PageHeader',
  props: {
    title: { type: String, required: true },
  },
  template: `
    <header>
      <h1>{{ title }}</h1>
      <slot name="action" />
    </header>
  `,
});

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

async function mountFailureState(failedDependency: FailedDependency): Promise<VueWrapper> {
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

  const { default: PreferenceSettingsPage } = await import('../../PreferenceSettingsPage.vue');
  const wrapper = mount(PreferenceSettingsPage, {
    global: {
      stubs: {
        PageHeader: PageHeaderStub,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

function clearPageMocks(): void {
  vi.doUnmock('@/composables/useEnums');
  vi.doUnmock('@/stores/auth');
  vi.doUnmock('@/stores/decisionDialog');
  vi.doUnmock('@/stores/notify');
  vi.doUnmock('@/stores/profile');
  vi.doUnmock('@/stores/savedOutfits');
  vi.doUnmock('vue-router');
}

function expectOnlyFailureUi(wrapper: VueWrapper): void {
  expect(wrapper.text()).toContain('偏好读取失败');
  expect(wrapper.text()).toContain('重新加载');
  expect(wrapper.text()).not.toContain('喜欢风格');
  expect(wrapper.text()).not.toContain('喜欢颜色');
  expect(wrapper.text()).not.toContain('简约');
  expect(wrapper.text()).not.toContain('黑色');
}

let mountedWrapper: VueWrapper | null = null;

afterEach(() => {
  mountedWrapper?.unmount();
  mountedWrapper = null;
  clearPageMocks();
});

describe('PreferenceSettingsPage 关键数据读取失败', () => {
  it('Profile 读取失败时只显示失败状态，不显示风格和颜色编辑区', async () => {
    mountedWrapper = await mountFailureState('profile');

    expectOnlyFailureUi(mountedWrapper);
  });

  it('metadata 读取失败时只显示失败状态，不显示风格和颜色编辑区', async () => {
    mountedWrapper = await mountFailureState('metadata');

    expectOnlyFailureUi(mountedWrapper);
  });
});

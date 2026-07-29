/**
 * 测试类型：Vue Test Utils 组件 UI 行为测试。
 * 测试对象/范围：PreferenceSettingsPage 返回按钮对未保存草稿的 stay、discard、save 决定。
 * 隔离内容：隔离 Router、Profile/收藏 Store、metadata、Decision Dialog、通知和 PageHeader；不连接真实 Backend，不测试浏览器历史。
 */
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileState } from '../../../../stores/types/profile';

type LeaveChoice = 'stay' | 'discard' | 'save';

interface MountedBackScenario {
  wrapper: VueWrapper;
  routerBack: ReturnType<typeof vi.fn>;
  saveProfile: ReturnType<typeof vi.fn>;
}

const PageHeaderStub = defineComponent({
  name: 'PageHeader',
  emits: ['back'],
  props: {
    title: { type: String, required: true },
    back: { type: Boolean, default: false },
  },
  template: `
    <header>
      <button type="button" data-test="back-button" @click="$emit('back')">返回</button>
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

function getButtonByText(wrapper: VueWrapper, label: string): DOMWrapper<HTMLButtonElement> {
  const button = wrapper
    .findAll<HTMLButtonElement>('button')
    .find((candidate) => candidate.text().trim() === label);

  if (!button) throw new Error(`找不到文字为“${label}”的按钮`);
  return button;
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

  vi.doMock('@/composables/useEnums', () => ({ useEnums: () => enums }));
  vi.doMock('@/stores/auth', () => ({
    useAuthStore: () => ({
      loggedIn: true,
      openAuth: vi.fn(),
    }),
  }));
  vi.doMock('@/stores/decisionDialog', () => ({
    useDecisionDialogStore: () => ({
      choose: vi.fn(() => Promise.resolve(choice)),
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
      back: routerBack,
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
  await getButtonByText(wrapper, '运动').trigger('click');

  return {
    wrapper,
    routerBack,
    saveProfile: profileStore.saveProfile,
  };
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

async function clickBack(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[data-test="back-button"]').trigger('click');
  await flushPromises();
}

let mountedWrapper: VueWrapper | null = null;

afterEach(() => {
  mountedWrapper?.unmount();
  mountedWrapper = null;
  clearPageMocks();
});

describe('PreferenceSettingsPage 返回按钮离页决定', () => {
  it('选择继续编辑时不返回，并且保留当前草稿', async () => {
    const scenario = await mountDirtyPage('stay');
    mountedWrapper = scenario.wrapper;

    await clickBack(scenario.wrapper);

    expect(scenario.routerBack).not.toHaveBeenCalled();
    expect(getButtonByText(scenario.wrapper, '运动').attributes('aria-pressed')).toBe('true');
  });

  it('选择放弃修改时恢复初始草稿，然后返回', async () => {
    const scenario = await mountDirtyPage('discard');
    mountedWrapper = scenario.wrapper;

    await clickBack(scenario.wrapper);

    expect(scenario.routerBack).toHaveBeenCalledOnce();
    expect(getButtonByText(scenario.wrapper, '运动').attributes('aria-pressed')).toBe('false');
  });

  it('选择保存并离开且保存成功时，先保存完整候选 Profile，再返回', async () => {
    const scenario = await mountDirtyPage('save');
    mountedWrapper = scenario.wrapper;

    await clickBack(scenario.wrapper);

    expect(scenario.saveProfile).toHaveBeenCalledOnce();
    expect(scenario.saveProfile).toHaveBeenCalledWith({
      ...confirmedProfile(),
      styles: ['Minimalist', 'Sporty'],
      colors: ['Black'],
    });
    expect(scenario.routerBack).toHaveBeenCalledOnce();
  });

  it('选择保存并离开但保存失败时，不返回并且保留当前草稿', async () => {
    const scenario = await mountDirtyPage('save', false);
    mountedWrapper = scenario.wrapper;

    await clickBack(scenario.wrapper);

    expect(scenario.saveProfile).toHaveBeenCalledOnce();
    expect(scenario.routerBack).not.toHaveBeenCalled();
    expect(getButtonByText(scenario.wrapper, '运动').attributes('aria-pressed')).toBe('true');
  });
});

/**
 * 测试类型：Vue Test Utils + MSW 跨页 API 组件集成测试。
 * 测试对象/范围：真实 PreferenceSettingsPage、PreferencePage、Profile API、Profile Mapping 和 Profile Store 的保存/回读链。
 * 隔离内容：MSW 隔离 Backend；替换 Quasar Router 启动外壳和视觉组件，不替换 Profile 业务模块，不连接真实登录服务。
 */
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { defineComponent } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnumsAll } from '@/api/types/metadata';
import type { Profile, ProfilePatch } from '@/api/types/profile';
import { STORAGE_KEYS } from '@/constants/storage';
import { ROUTES } from '@/constants/routes';
import { mockFixtures } from '@/mocks/fixtures';
import { useProfileStore } from '../../../../stores/profile';
import PreferencePage from '../../PreferencePage.vue';
import PreferenceSettingsPage from '../../../profile/PreferenceSettingsPage.vue';

vi.mock('@/stores/profile', async () => await import('../../../../stores/profile'));
vi.mock('@/router', () => ({ getRouter: vi.fn() }));

const PageHeaderStub = defineComponent({
  name: 'PageHeader',
  emits: ['back'],
  props: {
    title: { type: String, required: true },
    back: { type: Boolean, default: false },
  },
  template: `
    <header>
      <button
        v-if="back"
        type="button"
        data-test="back-button"
        @click="$emit('back')"
      >
        返回
      </button>
      <h1>{{ title }}</h1>
      <slot name="action" />
    </header>
  `,
});

const AppIconStub = defineComponent({
  name: 'AppIcon',
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 24 },
  },
  template: '<span aria-hidden="true"></span>',
});

const TestApp = defineComponent({
  components: { RouterView },
  template: '<RouterView />',
});

let serverProfile: Profile;
let receivedPatch: ProfilePatch | null;
const mountedWrappers: VueWrapper[] = [];

function initialServerProfile(): Profile {
  const profile = structuredClone(mockFixtures.profile) as unknown as Profile;
  profile.preferences = {
    style_tags: ['简约'],
    style_tags_en: ['minimalist'],
    color_preferences: ['黑'],
    color_preferences_en: ['Black'],
  };
  return profile;
}

function confirmedServerProfile(): Profile {
  const profile = structuredClone(mockFixtures.profile) as unknown as Profile;
  profile.preferences = {
    style_tags: ['简约', '运动'],
    style_tags_en: ['minimalist', 'sporty'],
    color_preferences: ['黑', '红'],
    color_preferences_en: ['Black', 'Red'],
  };
  profile.updated_at = '2026-07-29T12:00:00Z';
  return profile;
}

function ok<T>(data: T) {
  return HttpResponse.json({
    code: 0,
    message: 'ok',
    data,
  });
}

const server = setupServer(
  http.get('*/metadata/enums', () =>
    ok(structuredClone(mockFixtures.enums) as unknown as EnumsAll),
  ),
  http.get('*/users/me/profile', () => ok(structuredClone(serverProfile))),
  http.put('*/users/me/profile', async ({ request }) => {
    receivedPatch = (await request.json()) as ProfilePatch;
    serverProfile = confirmedServerProfile();
    return ok(structuredClone(serverProfile));
  }),
  http.get('*/user/outfits', () => ok({ items: [] })),
);

function getButtonByText(wrapper: VueWrapper, label: string): DOMWrapper<HTMLButtonElement> {
  const button = wrapper
    .findAll<HTMLButtonElement>('button')
    .find((candidate) => candidate.text().trim() === label);

  if (!button) throw new Error(`找不到文字为“${label}”的按钮`);
  return button;
}

function routes(): RouteRecordRaw[] {
  return [
    {
      path: '/preference',
      name: ROUTES.preference,
      component: PreferencePage,
    },
    {
      path: '/preference-settings',
      name: ROUTES.preferenceSettings,
      component: PreferenceSettingsPage,
    },
    {
      path: '/profile',
      name: ROUTES.profile,
      component: { template: '<div>我的</div>' },
    },
  ];
}

async function mountAt(
  routeName: typeof ROUTES.preference | typeof ROUTES.preferenceSettings,
): Promise<{
  pinia: ReturnType<typeof createPinia>;
  router: Router;
  wrapper: VueWrapper;
}> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes(),
  });

  await router.push({ name: routeName });
  const wrapper = mount(TestApp, {
    global: {
      plugins: [pinia, router],
      stubs: {
        PageHeader: PageHeaderStub,
        AppIcon: AppIconStub,
      },
    },
  });
  mountedWrappers.push(wrapper);
  await router.isReady();
  await flushPromises();

  return { pinia, router, wrapper };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  serverProfile = initialServerProfile();
  receivedPatch = null;
  localStorage.setItem(STORAGE_KEYS.accessToken, 'api-integration-token');
});

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => server.close());

describe('PreferenceSettingsPage 到 PreferencePage 的真实 Profile 保存链', () => {
  it('PUT 确认的偏好可由后续 GET 回读，并在返回后渲染为摘要', async () => {
    const { pinia, router, wrapper } = await mountAt(ROUTES.preference);

    expect(wrapper.text()).toContain('简约');
    expect(wrapper.text()).toContain('黑');

    await wrapper.get('.summary-card--style').trigger('click');
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(ROUTES.preferenceSettings);
    });
    await flushPromises();

    await getButtonByText(wrapper, '运动').trigger('click');
    await getButtonByText(wrapper, '红').trigger('click');
    await getButtonByText(wrapper, '保存').trigger('click');
    await flushPromises();

    expect(receivedPatch).toEqual({
      style_tags_en: ['minimalist', 'sporty'],
      color_preferences_en: ['Black', 'Red'],
    });

    const profileStore = useProfileStore(pinia);
    expect(profileStore.profile.styles).toEqual(['minimalist', 'sporty']);
    expect(profileStore.profile.colors).toEqual(['Black', 'Red']);

    await wrapper.get('[data-test="back-button"]').trigger('click');
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(ROUTES.preference);
    });
    await flushPromises();

    expect(wrapper.text()).toContain('简约');
    expect(wrapper.text()).toContain('运动');
    expect(wrapper.text()).toContain('黑');
    expect(wrapper.text()).toContain('红');

    const colorCardStyle = wrapper.get('.color-card').attributes('style');
    expect(colorCardStyle).toContain('linear-gradient(180deg');
    expect(colorCardStyle).toContain('rgb(102, 103, 109) 0%');
    expect(colorCardStyle).toContain('rgb(219, 125, 131) 100%');
  });

  it('PUT 失败时保留二级页草稿，并继续保留上一次 GET 确认的 Store', async () => {
    server.use(
      http.put('*/users/me/profile', () =>
        HttpResponse.json(
          {
            code: 50000,
            message: 'internal server error',
          },
          { status: 500 },
        ),
      ),
    );

    const { pinia, router, wrapper } = await mountAt(ROUTES.preferenceSettings);

    await getButtonByText(wrapper, '运动').trigger('click');
    await getButtonByText(wrapper, '红').trigger('click');
    await getButtonByText(wrapper, '保存').trigger('click');
    await flushPromises();

    expect(getButtonByText(wrapper, '运动').attributes('aria-pressed')).toBe('true');
    expect(getButtonByText(wrapper, '红').attributes('aria-pressed')).toBe('true');

    const profileStore = useProfileStore(pinia);
    expect(profileStore.profile.styles).toEqual(['minimalist']);
    expect(profileStore.profile.colors).toEqual(['Black']);
    expect(router.currentRoute.value.name).toBe(ROUTES.preferenceSettings);
  });
});

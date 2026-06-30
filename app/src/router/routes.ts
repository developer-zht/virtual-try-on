import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      // 进来默认跳欢迎页
      { path: '', redirect: '/welcome' },

      // 7 个 Tag 页。meta.order 是页面序号，步骤②用它判断左滑/右滑方向
      {
        path: 'welcome',
        name: 'welcome',
        meta: { order: 1 },
        component: () => import('@/pages/WelcomePage.vue'),
      },
      {
        path: 'scan',
        name: 'scan',
        meta: { order: 2 },
        component: () => import('@/pages/ScanPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        meta: { order: 3 },
        component: () => import('@/pages/ProfilePage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        meta: { order: 4 },
        component: () => import('@/pages/SettingsPage.vue'),
      },
      {
        path: 'result',
        name: 'result',
        meta: { order: 5 },
        component: () => import('@/pages/ResultPage.vue'),
      },
      {
        path: 'explore',
        name: 'explore',
        meta: { order: 6 },
        component: () => import('@/pages/ExplorePage.vue'),
      },
      {
        path: 'workshop',
        name: 'workshop',
        meta: { order: 7 },
        component: () => import('@/pages/WorkshopPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;

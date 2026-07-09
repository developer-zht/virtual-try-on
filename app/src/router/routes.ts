import type { RouteRecordRaw } from 'vue-router';

// 11 条路由，对应当前 App.js 的活页面（step 6 Explore 已废弃，不含）。
// meta.order = 页面序号，MainLayout 用它判断前进/后退滑动方向。
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/welcome' },

      // 主流程
      {
        path: 'welcome',
        name: 'welcome',
        meta: { order: 1 },
        component: () => import('@/pages/WelcomePage.vue'),
      },
      {
        path: 'home',
        name: 'home',
        meta: { order: 2 },
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'scan',
        name: 'scan',
        meta: { order: 3 },
        component: () => import('@/pages/ScanPage.vue'),
      },
      {
        path: 'profile-form',
        name: 'profile-form',
        meta: { order: 4 },
        component: () => import('@/pages/ProfileFormPage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        meta: { order: 5 },
        component: () => import('@/pages/SettingsPage.vue'),
      },
      {
        path: 'result',
        name: 'result',
        meta: { order: 6 },
        component: () => import('@/pages/ResultPage.vue'),
      },
      {
        path: 'workshop',
        name: 'workshop',
        meta: { order: 7 },
        component: () => import('@/pages/WorkshopPage.vue'),
      },
      {
        path: 'new-home',
        name: 'new-home',
        meta: { order: 8 },
        component: () => import('@/pages/NewHomePage.vue'),
      },

      // 子页（从 home / new-home 跳入，返回来源页）
      {
        path: 'profile-detail',
        name: 'profile-detail',
        meta: { order: 9 },
        component: () => import('@/pages/ProfileDetailPage.vue'),
      },
      {
        path: 'wardrobe',
        name: 'wardrobe',
        meta: { order: 10 },
        component: () => import('@/pages/WardrobePage.vue'),
      },
      {
        path: 'preference',
        name: 'preference',
        meta: { order: 11 },
        component: () => import('@/pages/PreferencePage.vue'),
      },
    ],
  },

  // 404 兜底，放最后
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;

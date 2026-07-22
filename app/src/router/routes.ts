import { ROUTES } from '@/constants/routes';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'), // 壳（layout）
    children: [
      {
        path: '',
        redirect: () => {
          // TODO(后续步骤): 接入 auth/wardrobe store 后按状态分流：
          //   if (!auth.loggedIn) return { name: ROUTES.login };
          //   if (wardrobe.isEmpty) return { name: ROUTES.wardrobe };
          //   return { name: ROUTES.home };
          return { name: ROUTES.home };
        },
      }, // 访问 / 自动跳首页

      // ==================== Tab 主页 Home ====================
      {
        path: 'home',
        name: ROUTES.home,
        meta: { tab: true, title: '首页' },
        component: () => import('@/pages/NewHomePage.vue'),
      },
      // ----- 二级页面 自由搭配 Workshop -----
      {
        path: 'workshop',
        name: ROUTES.workshop,
        component: () => import('@/pages/WorkshopPage.vue'),
        meta: { overlay: true, title: '创意工坊' },
      },

      // ==================== Tab 电子衣柜 Wardrobe ====================
      {
        path: 'wardrobe',
        name: ROUTES.wardrobe,
        meta: { tab: true, title: '电子衣柜' },
        component: () => import('@/pages/WardrobePage.vue'),
      },

      // ==================== Tab 偏好 Preference ====================
      {
        path: 'preference',
        name: ROUTES.preference,
        meta: { tab: true, title: '偏好' },
        component: () => import('@/pages/PreferencePage.vue'),
      },

      // ==================== Tab 我的 Profile ====================
      {
        path: 'profile',
        name: ROUTES.profile,
        meta: { tab: true, title: '我的' },
        component: () => import('@/pages/profile/ProfilePage.vue'),
      },
      // ----- 二级页面 身体数据 Body-Data -----
      {
        path: 'body-data',
        name: ROUTES.bodyData,
        meta: { overlay: true, title: '身体数据' },
        component: () => import('@/pages/profile/BodyDataPage.vue'),
      },
    ],
  },

  // ==================== 兜底 404 ====================
  { path: '/:catchAll(.*)*', component: () => import('@/pages/ErrorNotFound.vue') }, // 404
];

export default routes;

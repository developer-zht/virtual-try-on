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

      // ===== 4 个主 Tab（平级）=====
      {
        path: 'home',
        name: ROUTES.home,
        meta: { tab: true, title: '首页' },
        component: () => import('@/pages/NewHomePage.vue'),
      },
      {
        path: 'wardrobe',
        name: ROUTES.wardrobe,
        meta: { tab: true, title: '电子衣柜' },
        component: () => import('@/pages/WardrobePage.vue'),
      },
      {
        path: 'preference',
        name: ROUTES.preference,
        meta: { tab: true, title: '偏好' },
        component: () => import('@/pages/PreferencePage.vue'),
      },
      {
        path: 'profile',
        name: ROUTES.profile,
        meta: { tab: true, title: '我的' },
        component: () => import('@/pages/ProfilePage.vue'),
      },

      // ===== 引导流 / 浮层（后续步骤再整理；无 meta.tab，不显示 Tab 栏）=====
      // { path: 'welcome', name: ROUTES.welcome, component: () => import('@/pages/WelcomePage.vue') },
      // { path: 'scan', name: ROUTES.scan, component: () => import('@/pages/ScanPage.vue') },
      // {
      //   path: 'profile-form',
      //   name: ROUTES.profileForm,
      //   component: () => import('@/pages/deprecated/ProfileFormPage.vue'),
      // },
      {
        path: 'workshop',
        name: ROUTES.workshop,
        component: () => import('@/pages/WorkshopPage.vue'),
        meta: { overlay: true, title: '创意工坊' },
      },
    ],
  },

  { path: '/:catchAll(.*)*', component: () => import('@/pages/ErrorNotFound.vue') }, // 404 垫底
];

export default routes;

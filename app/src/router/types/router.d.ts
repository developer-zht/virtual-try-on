import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * 是否显示在底部 Tab 中
     */
    tab?: boolean;

    /**
     * 是否作为 Overlay 页面
     */
    overlay?: boolean;

    /**
     * 是否需要登录
     */
    requiresAuth?: boolean;

    /**
     * 页面标题
     */
    title?: string;
  }
}

import { defineBoot } from '#q-app'; // Quasar 的 boot 包装器，跟你 sentry.ts 里用的是同一个
import { createPinia } from 'pinia';

// defineBoot 的回调会拿到 { app, router, store, ssrContext }
// 我们只需要 app —— 把 Pinia 作为插件装到这个 Vue 应用上
export default defineBoot(({ app }) => {
  app.use(createPinia()); // 这一行 = 传统 Vue 里的 app.use(createPinia())
});

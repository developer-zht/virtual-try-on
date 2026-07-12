// 作用：启动时用 token 复活登录用户身份。
// 注册：quasar.config.ts 的 boot 数组里加 'auth'，且放在 'pinia' 之后：
import { defineBoot } from '#q-app';
import { useAuthStore } from '@/stores/auth';

export default defineBoot(() => {
  const auth = useAuthStore();
  // 不 await：让首屏立刻渲染。loggedIn 由 token 立即为真，user 等 /auth/me 回来后自动填上。
  void auth.restore();
});

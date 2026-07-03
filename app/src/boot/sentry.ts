import { defineBoot } from '#q-app';
import * as Sentry from '@sentry/vue';

// 箭头函数参数 { app, router } 没类型，而 TS 开了 noImplicitAny。正确做法是用 Quasar 的 boot 包装器 defineBoot，它会自动把 app、router 类型带上。
export default defineBoot(({ app, router }) => {
  // Quasar 会把 app、router 传进来
  Sentry.init({
    app,
    dsn: import.meta.env.SENTRY_DSN,

    // ── 性能监控：路由切换/首屏/Web Vitals(LCP/INP/CLS) 自动采集 ──
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 1.0, // 采样率，1.0=全量，线上可调 0.1 省额度

    // ── 想“先存本地”就加这段（做法2）──
    beforeSend(event) {
      fetch('http://localhost:4000/log', {
        method: 'POST',
        body: JSON.stringify({ t: Date.now(), event }),
      }).catch(() => {});
      return null; // 只写本地文件、不上云
    },

    // ── 想“断网缓存、联网补发”就加这行（做法1）──
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  });
});

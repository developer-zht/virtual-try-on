import { defineBoot } from '#q-app';
import * as Sentry from '@sentry/vue';

// 箭头函数参数 { app, router } 没类型，而 TS 开了 noImplicitAny。正确做法是用 Quasar 的 boot 包装器 defineBoot，它会自动把 app、router 类型带上。
export default defineBoot(({ app, router }) => {
  Sentry.init({
    app, // 把 Vue app 交给 Sentry，让它接管 Vue 的错误钩子
    dsn: import.meta.env.SENTRY_DSN, // 数据往哪送（DSN 里编码了项目 id + 公钥 + ingest 主机）
    // 多数版本的 SDK 里，enabled: false 会在 beforeSend 之前就短路——也就是说 SDK 直接判定"我关了"，根本不会执行 beforeSend
    // enabled: import.meta.env.PROD, // 只在生产真正上报

    // ── 性能监控：路由切换/首屏/Web Vitals(LCP/INP/CLS) 自动采集 ──
    integrations: [
      Sentry.browserTracingIntegration({ router }), // 装一个"性能追踪"插件，挂上路由 → 收路由耗时 + Web Vitals
    ],
    tracesSampleRate: Number(import.meta.env.SENTRY_TRACES_RATE), // 采样率（字符串→数字），1.0=全量，线上可调 0.1 省额度

    // 开发只落本地、不上云
    beforeSend(event) {
      // 事件发送前的最后一道钩子（可改、可拦）
      fetch(import.meta.env.LOG_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ t: Date.now(), event }),
      }).catch(() => {});
      return import.meta.env.PROD ? event : null; // 返回 event=发送；返回 null=丢弃（不上云）
    },

    // 用什么"运输工具"发
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport), // 断网缓存、联网补发
  });
});

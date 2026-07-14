# 页面生命周期 × 网络请求 处理笔记（切页 / 退后台 / 关程序）

> 场景：用户切 tab/路由、退到后台、关闭 app（含被系统 kill）时——怎么发请求、怎么处理响应、有哪些坑。
> 项目落地：`home` 的 `loadToday`(读)/`persistToday`(写)、`pollTask` 轮询；iOS 走 Capacitor(WKWebView)。

## 1. 三类场景 & 触发的事件

| 场景                     | Web 事件                                                 | Capacitor(原生)                                   |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------- |
| 应用内切页/路由          | vue-router `onBeforeRouteLeave` / 组件 `onBeforeUnmount` | 同                                                |
| 退到后台 / 切走 app      | `visibilitychange` → `document.hidden`                   | `App` `appStateChange {isActive:false}` / `pause` |
| 回到前台                 | `visibilitychange` → visible、`pageshow`                 | `appStateChange {isActive:true}` / `resume`       |
| 关闭 / 杀进程 / 导航离站 | `pagehide`、（不可靠）`beforeunload`                     | 无可靠事件（被 kill 不通知）                      |
| bfcache 冻结/恢复        | `freeze`/`resume`、`pageshow(persisted)`                 | —                                                 |

## 2. 各时机下网络请求靠不靠谱

| 时机                        | 页面状态   | 发请求能完成吗            | 建议                                     |
| --------------------------- | ---------- | ------------------------- | ---------------------------------------- |
| `visibilitychange → hidden` | **还活着** | ✅ 能发完                 | **这是「退出前 flush」的正确时机**       |
| `onBeforeRouteLeave`        | 还活着     | ✅                        | 应用内离开时 flush                       |
| `pagehide` / `beforeunload` | 正在拆     | ⚠️ 可能被掐断             | 别依赖；要送达用 `fetch(keepalive:true)` |
| 被系统 kill                 | 已死       | ❌                        | 不可能；靠 hidden 提前存好               |
| 后台中（hidden 之后）       | 冻结/限流  | ❌ 定时器/网络被 throttle | 轮询会停；回前台再续                     |

## 3. 关键结论（怎么做）

- **写(flush)挑 `visibilitychange → hidden`**：退后台**一定先于**被系统 kill，此刻页面活着、PUT 能发完 → 随后被杀也不丢。`onBeforeRouteLeave`/`onBeforeUnmount` 补「应用内离开」。
- **别指望「退出瞬间」的网络写**：`pagehide`/`beforeunload` 时页面在拆，异步请求可能被掐断。
  - `navigator.sendBeacon`：能在 unload 送达，但**只 POST、发不了自定义头**（带不了 `Authorization: Bearer`）→ 我们的 PUT 用不了。
  - **`fetch(url, { keepalive: true, ... })`**：能带 Auth 头、能自定义方法，是**带鉴权的 unload 送达**更好的选择（限小 body，约 64KB）。真要在 `pagehide` 兜底送 PUT，用它。
- **去重**：`onBeforeRouteLeave` + `visibilitychange` + `pagehide` 可能同时点火 → 用一个 `lastSent` 记住上次发的 id，同值不重复发。
- **读(refresh)挑回前台**：`visibilitychange → visible` / `pageshow` / Capacitor `resume` 时**重新拉数据**（如 `loadToday`）。因为：① 后台期间数据可能变旧；② **presigned OSS URL 约 1h 过期**，久置回来图片会 403 → 必须重取。
- **bfcache**：`pageshow` 的 `event.persisted === true` = 从 bfcache 恢复，此时 `onMounted` **不会**再跑 → 要在 `pageshow` 里补一次 refresh。

## 4. 轮询(pollTask)在后台的坑

- 退后台后 `setTimeout` / 网络被 throttle → `pollTask` 会**卡住不前进**（不是报错，是暂停）。
- 回前台若还在等：可能已超 `maxWaitMs` 抛 `TaskTimeoutError`，或续上继续。
- 做法：长轮询任务（试穿/模特）**别假设后台还在跑**。可在 `hidden` 时暂停轮询、`visible` 时用 `getTask` 查当前状态、需要再续。

## 5. 响应回来后的处理坑

- **await 之后的副作用**：`await 请求` 期间若组件被卸载，`await` 后面那些 `xxx.value = ...` 可能作用在已销毁的组件上（Vue 警告或静默丢弃）。→ **关键状态写进 store**（store 不随组件卸载销毁），组件只读。`loadToday`/`generate` 放在 store 正是这个原因。
- **竞态**：切走又切回 / 快速重复触发 → 后发的请求可能先回。必要时记 requestId / 用最新覆盖，或在 store 里用 `loading` 串行化。

## 6. Capacitor / iOS 具体

- WKWebView 退后台**会**发 `visibilitychange(hidden)`、回前台发 visible → Web 那套够用，**先不引原生依赖**。
- 更稳可接 `@capacitor/app`：`App.addListener('appStateChange', ({ isActive }) => …)`（后台 flush、前台 refresh）、`pause`/`resume`。
- iOS 后台会**暂停 JS 定时器与网络**；长任务轮询回前台需自查状态。

## 7. 本项目落地对照

| 用途               | 函数                         | 挂哪些时机                                                                                                                                      |
| ------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| flush 写今日穿搭   | `home.persistToday(id)`      | `visibilitychange(hidden)` + `onBeforeRouteLeave` + `onBeforeUnmount` + `pagehide`(兜底)，`lastPersisted` 去重；放 store、best-effort、失败静默 |
| refresh 读今日穿搭 | `home.loadToday()`           | `onMounted` +（建议）`visibilitychange(visible)`/`pageshow`                                                                                     |
| 异步任务轮询       | `pollTask`（导入/试穿/模特） | 后台不保证前进，回前台按需续                                                                                                                    |

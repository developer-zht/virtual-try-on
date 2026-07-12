# 前端错误与文案约定（Frontend Error & Copy Conventions）

> 建议落到主仓库 `docs/frontend-error-conventions.md`。这是一份「活文档」：约定 + TODO 都写这。

## 1. 错误类分层（`src/errors/index.ts`，已实现）

| 类                 | 含义                             | 谁抛                         |
| ------------------ | -------------------------------- | ---------------------------- |
| `AppError`         | 所有「我们主动抛的已知错误」基类 | 基类                         |
| `ApiError`         | HTTP 2xx 但业务 `code !== 0`     | `request.ts`                 |
| `HttpError`        | 服务器有响应但状态非 2xx         | `request.ts`                 |
| `NetworkError`     | 压根没拿到响应                   | `request.ts`                 |
| `ValidationError`  | 客户端输入不合法（发请求前挡下） | 业务层（如 `importGarment`） |
| `TaskTimeoutError` | 轮询超时                         | `pollTask`                   |

**判据**：`instanceof AppError` = 已知、预期内、已给用户提示 → 不上 Sentry；否则 = 真 bug → 上 Sentry（见 `boot/sentry.ts` 的 `beforeSend`）。

## 2. 两个受众：`code`（开发者） vs `message`（用户）

校验函数（`utils/validators.ts`）返回 `FieldError { code, message }`：

- **`message`（用户向）**：友好、可直接显示，**会变**——随产品语气、随 i18n。
- **`code`（开发者向）**：稳定、可搜索、不随文案变。用途：
  - 测试断言：`expect(err.code).toBe('PASSWORD_NO_DIGIT')`（断言中文串会随文案改而碎）。
  - 日志 / 埋点：记 `code`，不记会变的中文。
  - i18n key：将来 `message` 换成 `t(code)`。

### 铁律：控制流判断看**类型/code**，绝不看 `message` 字符串

```ts
// ❌ 反例：拿"给用户看的文案"当控制流 —— 文案一改，逻辑静默失效
if (error.value === '未知错误，请稍后重试') throw e;

// ✅ 正解：看类型
if (!(e instanceof AppError)) throw e;
```

## 3. 用户文案的唯一出口

`utils/errorMessage.ts` 的 `messageFromError(e)` 是「错误对象 → 用户文案」的**唯一**翻译处。
`_runAsync` 内部已调用它；组件/store 不要各写各的 instanceof 分支。

## 4. 校验规则（single source of truth）

- 邮箱：`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- 密码：≥8 位，且同时含英文字母与数字
- 规则只在 `utils/validators.ts` 定义一处；UI 表单不要再写第二套。

## 5. TODO

- [ ] i18n 接入：把 `FieldError.message` 与 `messageFromError` 的返回改成 `t(code)`；`code` 已就绪可直接当 key。
- [ ] 给 `ValidationError` 增加可选 `code?: string`，让"抛异常"这条路也能带上开发者向的稳定码（目前只有"返回值"这条路带 code）。
- [ ] 错误码表：把所有 `code`（`PASSWORD_NO_DIGIT` …）集中列一张表，避免重名/漂移。
- [ ] 埋点：`messageFromError` 命中 `else`（未知错误）时打一条 warn 日志带 `code`，方便发现"漏翻译的已知错误"。

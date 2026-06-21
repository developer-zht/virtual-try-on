# AIKit

跨 App 复用的 **AI 管道**（与具体业务无关）。完整约定见仓库 `docs/cross-app-ai-sharing.md`。

- `Sources/AIKitCore`：**零 SwiftUI、零业务**的接口与状态机
  —— `AIProvider` / `AIRequest` / `ChatSession` / `AIConsent`。
- `Sources/AIKitUI`：通用聊天 SwiftUI 组件（**任务③**加入）。

## 设计要点
- **多模态 + 流式**从第一天就在接口里（`AIRequest.attachments` / `AIProvider.stream`）。
- `AIProvider` 是协议：`BackendProxyProvider`（StyleTwin 后端代理）与
  `DirectProvider`（CFD 端上直连）都是它的实现，上层 `ChatSession`/UI 不变。
- **许可证 MIT**：保证将来抽成独立 Swift Package 时**不沾 GPL**。

## 测试
```bash
cd AIKit && swift test
```

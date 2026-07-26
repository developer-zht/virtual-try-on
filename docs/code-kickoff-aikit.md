# 代码开工 Kickoff — 从 SRS 到漂亮代码：AI 层实战教学

> ⚠️ **阶段定位**：本文用 **Swift** 讲，属 **第二阶段·原生** 的 AI 层。2026-07 已拍板 **Web 先行**——**第一阶段 AI 层是 TypeScript**。若现在就想学：教学**方法论（需求→架构→详设→选型→评价标准）完全通用**，只是把 Swift 例子换成 TS 即可；等到原生阶段再原样用 Swift 版。**后端 = 方案 A（无后端、用户自带 Key）**。
> **用途**：这是一次**教学会话**的开场。建议**开新对话**（干净上下文），把文末「开场白」整段复制进去即可启动。
> **形式**：以「3D 试衣 App 的 **AI 层**」为真实载体，**边教边写最小可编译 Swift 代码**，学会一条完整链路——
> **需求(SRS) → 架构设计 → 详细设计 → 选型 → 漂亮代码**，并建立一套「**代码评价标准**」让「漂亮」可打分。
> 关联：SRS 与两份前置 kickoff 都在分支 `claude/3d-tryon-srs-svsasl`。

---

## 四层阶梯（先记住这张图，全程按它对账）
```
① 需求（SRS）      要什么 & 为什么          —— docs/SRS-3D-tryon-native.md
        ↓ 只与相邻层对账
② 架构设计（HLD）  分几块 / 块之间的接缝     —— SRS §4
        ↓
③ 详细设计（LLD）  每块的类型/签名/存储      —— SRS §4.4 / §6.4 / §7.2
        ↓
④ 代码            能编译运行的实现          —— AIKit/*.swift + 本次要写的 DirectProvider 等
```
**规律**：代码不直接对 SRS，代码对「详设」，详设对「架构」，架构才直接对需求。每一步都要能**往上指回一条需求**（可追溯 = SRS §12 附录 A）。

## 前置阅读（新对话里先读）
- `docs/SRS-3D-tryon-native.md` —— 重点 **§4 技术架构**、**§4.5 AIKit 边界**、**§6.4 两类 Provider**、**§8 端上直连与密钥管理**、**§7.2 数据模型**、约束 **C-5/C-6**、**NFR-2/3/6**、附录 A 追踪矩阵
- `docs/cross-app-ai-sharing.md` —— AIKit「宪法」：**§2 接口契约**、**§4 两 App 差异**、**§5 D-A..D-F 待拍板**、**§6 复用节奏**
- `AIKit/`（**实际代码**）—— `AIProvider` / `AIModels` / `ChatSession` / `AIConsent` 四文件 + `Package.swift`
- `docs/code-kickoff-ios.md` —— 方案 A / DirectProvider / Keychain 的对齐说明

## 学员画像 & 教学方式
- 学员 = **产品方 + 学习者、非工程师**。
- **先大白话讲「在干嘛 / 为什么」，再写代码**；关键选型**列候选 + 取舍、交我拍板**。
- ★ 每一步**显式标注它处在哪一层**（需求 / 架构 / 详设 / 代码），别再混着讲。
- 代码**最小可编译**、够说明思路即可；不追求一次写全。

## 已冻结（别推翻）
- **方案 A**：无后端、端上直连大模型、**用户自带 API Key**（存 iOS **Keychain**，不硬编 / 不随包）。
- **Provider 抽象**：理解/分类复用 `AIKitCore.AIProvider`（实现为 **`DirectProvider`**）；纹理生成 = 本 App 专属 **`TextureGenProvider`**（不进共享层）。
- **契约**：`AIRequest/AIResponse` 值类型；**多模态 + 流式**从第一天留好；错误分类 `AIError`；同意 `AIConsent`。
- Spike A–E 已验证的技术点不再质疑。

---

## 教学主线（沿阶梯走，落到一个真实交付物）
**交付物 = 3D App 的「AI 层」最小可编译骨架**（在 AIKitCore 之上）。按四步教：

**第 1 步 · 需求 → 架构**
- 从 `C-5`（Provider 抽象/热替换）、`C-6`（无后端/用户 Key）、`NFR-2/3/6` 推出模块图与**依赖方向**：
  UI → 用例 → `AIProvider`(协议接缝) → `DirectProvider`(实现) → 各家模型；`TextureGenProvider` 旁挂；`AIConsent` 作独立部件。
- **产出**：一张模块图 + 每个架构决策**指回一条需求**的对照表（对照 SRS §4，验证是否一致）。

**第 2 步 · 架构 → 详细设计**
- 把每块拆成**类型/签名/存储**：`DirectProvider{ apiKey, endpoint }` 的方法；**request builder**（`AIRequest → 某家 JSON`）；**response parser**（`→ AIResponse + AIUsage`）；`KeychainStore` 读写接口；`TextureGenProvider` 的输入/输出形状。
- **产出**：契约级类型清单（对照 SRS §6.4 / §8.2 / §7.2，查缺补漏）。

**第 3 步 · 选型（每个给候选 + 取舍，交我拍板）**
- 一串真实决策，对应 cross-app §5 的 **D-A..D-F**：
  - 错误：`throws` vs `Result`？　- 流式：`AsyncThrowingStream`？　- JSON：`Codable` 手写 vs 生成？
  - 依赖注入怎么做（初始化器注入 / 环境）？　- Key 存取：Keychain 封装成什么形状？
  - 网络：`URLSession` async/await；多厂商差异如何隔离（每家一个 builder/parser）？
- **产出**：每条一个决定 + 一句理由。

**第 4 步 · 详设 → 代码（漂亮地写）**
- 写最小可编译实现：`DirectProvider` + `KeychainStore` + 一个 request builder + **一个单元测试**（用假 Provider 验 `ChatSession` 流程）。
- **每写一段，回指它满足哪条详设/需求**，并对照下面的 rubric 自评。

---

## 代码评价标准（起手 rubric —— 让「漂亮」可打分）
> 会边写边细化；先用这 12 条给代码打分（✅/⚠️/❌ + 一句理由）。

| # | 标准 | 一句话判据 |
|---|---|---|
| 1 | **正确性** | 做到 SRS 要它做的，边界/错误路径都处理，无静默失败 |
| 2 | **单一职责** | 一个类型只干一件事；引擎零 UI、UI 只读状态发意图 |
| 3 | **面向接口 / 可替换** | 依赖协议不依赖具体实现；能塞假实现做测试 |
| 4 | **可测试性** | 纯逻辑与副作用分离；依赖可注入；无隐藏全局状态 |
| 5 | **命名即文档** | 名字读起来像自然语言、贴领域词（taxonomy/DesignDoc…），不用缩写黑话 |
| 6 | **值类型 & 不可变优先** | 能用 `struct`/`let` 就不用 `class`/`var`；跨并发用 `Sendable` |
| 7 | **错误显式且分类** | `throws` 抛 `AIError` 这类有类型的错误；调用方能分「可重试/不可重试」 |
| 8 | **最小惊讶 / 一致性** | 与周围代码同风格、同惯用法；读者不需要「猜」 |
| 9 | **无过度设计（YAGNI）** | 不为想象中的需求加抽象；但**已在 SRS 的**扩展点（如换厂商）要留好 |
| 10 | **Swift 惯用法** | async/await、`Codable`、`access control`（`public/internal/private`）、`extension` 组织、协议默认实现 |
| 11 | **关注点分层清晰** | Core 零业务零 UI；厂商差异关进各自 builder/parser；业务在外层 |
| 12 | **可追溯** | 每个类型/函数能指回一条需求（能填进附录 A 追踪矩阵） |

> 「漂亮」= 高分同时命中 **2/3/9/5**（分层干净、面向接口、不过度设计、名字自解释）——这几条最能区分「能跑」和「高标准」。

---

## 开场白（复制到新对话即可启动教学）
```
我要在一次【教学会话】里，学会把 SRS 里的「AI 层」一步步落实到漂亮的 Swift 代码。
载体 = 3D 试衣 App 的 AI 层（在 AIKitCore 之上）。先读分支 claude/3d-tryon-srs-svsasl 上的：
- docs/code-kickoff-aikit.md（本教学任务单：四层阶梯、教学主线、代码评价 rubric）
- docs/SRS-3D-tryon-native.md（重点 §4 架构 / §4.5 AIKit 边界 / §6.4 两类 Provider / §8 端上直连与密钥管理 / §7.2 / C-5 / C-6 / NFR-2/3/6 / 附录A）
- docs/cross-app-ai-sharing.md（AIKit 宪法：§2 契约 / §4 差异 / §5 D-A..D-F / §6 复用）
- AIKit/ 下的实际代码（AIProvider / AIModels / ChatSession / AIConsent）

我是产品方+学习者、非工程师：全程先大白话讲「在干嘛/为什么」再写代码，关键选型列候选+取舍交我拍板。
★ 每一步都要显式告诉我它在哪一层：需求 / 架构设计 / 详细设计 / 代码。

已冻结别推翻：方案 A（无后端、端上直连、用户自带 Key 存 Keychain）；理解分类复用 AIProvider（DirectProvider 实现）、
纹理生成为本 App 专属 TextureGenProvider；AIRequest/AIResponse 多模态+流式从第一天留好；Spike A–E 已验证。

请按 code-kickoff-aikit.md 的「教学主线」四步走：
1) 需求→架构：从 C-5/C-6/NFR 推出模块图与依赖方向，每个决策指回一条需求，并和 SRS §4 对账；
2) 架构→详设：拆成 DirectProvider / request builder / response parser / KeychainStore / TextureGenProvider 的类型与签名，和 §6.4/§8.2/§7.2 对账；
3) 选型：错误(throws/Result)、流式(AsyncThrowingStream)、JSON(Codable)、依赖注入、Keychain 封装、URLSession、多厂商隔离——各给候选+取舍交我拍板；
4) 详设→代码：写最小可编译的 DirectProvider + KeychainStore + 一个 request builder + 一个单元测试，每段回指需求，并用 rubric 自评。

开发分支按本对话的分支指示来（与文档分支分开）。
```

# 软件需求规格说明书（SRS）— 3D 虚拟试衣（**第一阶段 · Web**）

> **文档成熟度**：v0.1 草案（仍在编辑）｜**决策图例**：🔒 已批准冻结 ／ ☐ 待议。
> 正文 C-x 约束、两版本结构、一档纹理、透视相机、glTF、pnpm monorepo 均为 🔒；标 ☐ 者仍可讨论。
> 阶段：第一阶段·Web（TypeScript + WebGL2）｜编写 2026-07。
> **覆盖两个大版本**：有后端版 / 无后端版——差异只集中在 §4.4 / §7 / §8，其余全共享。
> **建于分支 `try-on-2d` 的现有 2D 代码**（Quasar+Vue+TS + Go 后端 + Python AI 引擎）之上，加「3D 试衣」线、最大化复用。
> **文档归位**：本 SRS 与其引用的权威文档统一收于合并分支 `claude/docs-hub` 的 `docs/`；§1.4 引用均为**同分支相对路径**（消除跨分支「找不到」）。

## 1. 引言

### 1.1 目的

定义「3D 试衣」线在 Web 第一阶段 MVP 的软件需求，作为产品/设计/研发/测试的共同基线与验收依据，并覆盖「有后端 / 无后端」两版本的共同需求与差异点。

### 1.2 背景与范围

一句话：用户捏近似身材的 3D 模特 → 从**衣柜里已有的服装图片**生成对应贴图 → 贴到预制 conforming 服装（glTF）→ **透视、可旋转**地展示与换装。
边界（本期不做）：动画、AR、文本→mesh、AI 生成 UV、写实脸（v2）、正交测量（☐ 待评估）。

### 1.3 术语

| 术语                        | 含义                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| morph target                | glTF 标准形变通道；运行时改权重即改形状（等价原生 blendshape）            |
| 分开法                      | 1 身体 + N 衣服各独立文件、各带同名 morph 通道，运行时组合、可换装        |
| UV / UV 模板                | 3D 表面「剪开摊平」到 2D(0–1) 的布局；模板 = 该布局 + 语义区域标注        |
| 语义区域 / segmentation map | UV 上预定义区域（FrontChest/Back/Sleeve…），供贴图按区域约束              |
| Provider                    | 被抽象的一类 AI 能力（衣服理解、纹理生成），接口固定、实现可换            |
| tryon3d-core                | 两版本共享的 3D 核心包（引擎/捏人/纹理/UI/Provider 接口）                 |
| 有后端版 / 无后端版         | 前者复用 Go 后端+Python AI 引擎；后者前端直连/mock，供 iOS 移植           |
| 一档纹理                    | MVP 纹理策略：从衣柜图片提「主色+图案类型」→ 纯色/可平铺图案，对齐固定 UV |

### 1.4 参考文档

均位于**本分支（`claude/docs-hub`）`docs/`** 下，为同分支相对路径：

- `docs/ARCH-CHANGE-monorepo-3d.md` —— 架构变更说明（monorepo 两版本）
- `docs/SRS-3D-tryon-native.md` —— 第二阶段·原生 SRS（移植目标；原产于分支 `claude/3d-tryon-srs-svsasl`）
- `docs/backlog.md`、`docs/SRS-kickoff.md` —— 产品前提 / 🔒决策（原产于分支 `claude/festive-wozniak-6pcz8e`）
- `docs/feasibility-3D-tryon.md`、`docs/spike-week1-blendshape-pipeline.md`、`docs/asset-pipeline-makehuman-to-usdz.md` —— 可行性 / Spike / 资产管线（同上分支）
- `docs/cross-app-ai-sharing.md` —— AIKit 宪法（Provider 抽象契约）

> 2D AI 内核文档**留在分支 `try-on-2d`**（与代码相邻、不搬）：`Veslune-Frontend_DEMO/VestiCore_demo/docs/AI_KERNEL_IMPLEMENTATION.md`、`API_PROTO_REQUIREMENTS.md`、`tryon_demo/BACKEND_INTEGRATION.md`。

### 1.5 约定

MoSCoW 优先级；编号 `FR-n / NFR-x / IF-x / C-x / A-x / RISK-x`。

## 2. 总体描述

### 2.1 愿景与定位

在现有 2D 穿搭产品里加入「捏个像自己的 3D 模特、从衣柜衣服图生成贴图、转着看」的 3D 试衣线，最大化复用 2D 的前端与 AI 内核。

### 2.2 两版本关系

- 有后端版（现有 `app/` 扩展）：AI/存储复用 Go 后端 + Python AI 引擎（Veslune）。
- 无后端版（新增 `app-standalone/`）：AI 前端直连/mock、存储用 IndexedDB；**无后端依赖 → 供第二阶段移植 iOS 原生最干净**。
- 两版本**共享 `packages/tryon3d-core`**（约 90% 代码），**只在 `providers/` + 存储 + 鉴权处分叉**。

### 2.3 功能概览

```
① 捏身材(滑块/骨骼缩放) ── 近似自己身材的 3D 模特
② 衣柜里的服装图片 ─→ 衣服理解(品类+主色+图案) ─→ 取对应 glTF Mesh
                        └─→ 一档纹理(主色/可平铺图案，对齐固定 UV) ─→ 贴到 Mesh
③ 换装(分开法: 同名 morph 同权重、互斥) ─→ ④ 透视相机 360° 旋转展示
⑤ 模特/衣橱/纹理/搭配 存档(有后端=服务端 / 无后端=IndexedDB)
```

### 2.4 用户角色

尝鲜型｜穿搭好奇型｜分享型。

### 2.5 运行环境

- 客户端：浏览器 **WebGL2**（自 iOS 15；iOS 26 起另有 WebGPU）；桌面/移动通用。
- 有后端版：现有 Go 后端 + Python AI 引擎（gRPC）+ 阿里百炼 DashScope。
- 无后端版：前端直连模型 / mock；IndexedDB。
- 上架：若上 App Store，需原生壳 + WKWebView + 真原生功能，规避 4.2。

### 2.6 设计与实现约束

- **C-1** 🔒 第一阶段栈 = TypeScript + WebGL2；建于 `try-on-2d` 的 Quasar/Vue。
- **C-2** 🔒 捏人 = morph target 权重 + 骨骼缩放；AI 只生成贴图，不生成 mesh、不生成 UV。
- **C-3** 🔒 分开法；资产格式 = glTF/GLB。
- **C-4** 🔒 资产主线 = MakeHuman(CC0)；排除 Daz/SMPL；CC4/MetaHuman 见 §5.8。
- **C-5** 🔒 AI 能力做 Provider 抽象；两版本 = 同接口两实现。
- **C-6** 🔒 两版本都要：有后端=薄代理(Key 服务端)；无后端=方案 A(自带 Key / mock)。
- **C-7** 🔒 纹理本期 = 一档（主色+可平铺图案，对齐固定 UV）；二/三档列后续。
- **C-8** 🔒 展示相机本期 = 透视；☐ 正交+标尺测量待评估。
- **C-9** 🔒 A-pose 展示姿势；零售模特视觉风。
- **C-10** 🔒 仓库改造为 pnpm monorepo（tryon3d-core + app + app-standalone）。
- **C-11** 🔒 满足 PIPL/GDPR。

### 2.7 假设与依赖

- **A-1** Spike A–E 是几何事实，换 WebGL 同样成立（`morphTargetInfluences` 为 three.js 原生能力）。
- **A-2** 复用 `try-on-2d` 前端（api/stores/composables/MSW/auth）与 AI 内核（Veslune，扩 3D 能力）。
- **A-3** 3D 美术人力是隐性大头（conforming 衣服 + 同名 morph + seam-aware UV 模板）。
- **A-4** 一档纹理不追求像素级复刻上传衣物；目标 = 「那类衣服 + 那个色/图案/质感」。

## 3. 功能需求

### FR-1 手动捏身材 — Must

折叠面板滑块驱动身材 morph（§5.2）+ 骨骼缩放；身体与在穿衣服同时形变。AC：实时形变、帧率可用；通道集落 §5.2；状态可存取（FR-7）。

### FR-2 展示视图（透视相机） — Must；正交测量态 — ☐ 待评估

本期：透视相机自由旋转/缩放。☐ 待评估：正交相机 + 标尺 + 实时读数（看过透视效果再定，不进本期主体）。AC：单指旋转、缩放流畅；可导出视角截图。

### FR-3 纹理生成（衣柜图片输入 · 一档） — Must

输入**仅**为用户上传到「衣柜」的服装图片（无文字输入）。一档：视觉理解提「品类+主色+图案类型」→ 生成贴图 = 主色/可平铺图案，**对齐衣服 Mesh 固定 UV**（§6）。AC：可触发/进度/重试；对齐固定 UV、无明显错位/白缝；不承诺复刻精确印花/文字/logo（A-4）；二/三档列后续。

### FR-4 衣服理解与选件 — Must

把衣柜图片归类到有限品类（taxonomy，§5.5）取对应 glTF Mesh；同时输出主色/图案供 FR-3。AC：图片为裙→取裙 Mesh；无匹配回退最近/提示；标签空间 = 库内 Mesh 集合。

### FR-5 换装（分开法） — Must

同一组身材权重同时写入身体与所选衣服的同名 morph；同部位互斥替换。AC：拖滑块衣服随体形变、无明显穿模；body-hiding+push-out 兜底；多件同穿。

### FR-6 360° 旋转展示 — Must

透视相机静态可旋转；不做动画。

### FR-7 存档 — Should

有后端=服务端；无后端=IndexedDB（§7）。AC：命名/增删/复用；大文件只存路径。

### 本期不做（Won't）

动画、AR、文本→mesh、AI 生成 UV、文字输入生成纹理、自动量身(ARKit·留第二阶段)、写实脸(v2)、正交测量(待评估)。

## 4. 技术架构（Web + monorepo）

### 4.1 monorepo 结构（pnpm workspace）

```
仓库根 (新建 pnpm-workspace.yaml)
├── packages/tryon3d-core/   两版本共享（引擎/捏人/纹理/UI/Provider 接口）
├── app/                     有后端版（现有 Quasar 应用扩 3D 线）
└── app-standalone/          无后端版（供 iOS 移植）
```

> **现状**：`try-on-2d` 当前**不是** monorepo（根无 `pnpm-workspace.yaml`；`app/pnpm-workspace.yaml` 仅 pnpm 设置）。
> **改造须知**：仓库根**已存在 `package.json` + husky + lint 等工具链**——monorepo 化须**合并保留、不得覆盖**：新增根 `pnpm-workspace.yaml` 声明 `packages/*` 与 `app*`，把现有根依赖/脚本纳入 workspace，而非另起。

### 4.2 tryon3d-core 分层

- `engine/`：WebGL2/three.js —— 加载 glTF、`morphTargetInfluences` 驱动身材、换 texture、**透视相机**（正交列待评估，暂不入 core）。
- `sculpt/`：捏人逻辑（通道权重、骨骼缩放）。
- `texture/`：**一档**纹理装配（主色/可平铺图案 → 对齐固定 UV 的贴图）。重型 Canvas 合成/设计文档 JSON = 可选·后续，不入本期。
- `providers/`：只定义接口 `AIProvider` / `TextureGenProvider`（不实现）。
- `ui/`：共享 Vue 组件（捏人折叠面板、旋转、衣橱选件）。

### 4.3 复用 try-on-2d

`api/`（axios+类型）、Pinia `stores/`、`composables/`、MSW mock、auth、Sentry。

### 4.4 两版本接缝（差异集中处）

| 维度              | 有后端版 `app/`                                    | 无后端版 `app-standalone/`        |
| ----------------- | -------------------------------------------------- | --------------------------------- |
| AI                | `BackendProxyProvider`→HTTP→Go→gRPC→Python AI 引擎 | `DirectProvider` / `MockProvider` |
| 存储              | 现有后端/服务端                                    | IndexedDB                         |
| 鉴权              | 现有 auth                                          | 无 / 本地                         |
| 引擎·捏人·纹理·UI | 共享 `tryon3d-core`                                | 共享 `tryon3d-core`               |

### 4.5 渲染与 morph

three.js 加载 glTF → 拿身体/各衣服 Mesh → `morphTargetInfluences[通道]` 同权重驱动身体+在穿衣服 → 换 texture = 设材质 `map` 并 `needsUpdate`。

## 5. 资产管线（离线，两阶段通用）

### 5.1 分开法

1 身体 + N 衣服各独立 glTF、各带同名 morph；运行时组合、可换装。

### 5.2 身材通道（8~10）

`k_weight·k_muscle·k_height·k_shoulder·k_hip·k_chest·k_waist·k_legLength·k_armLength`（`k_faceWidth` 可选）；身体与每件衣服同名。

### 5.3 MakeHuman → Blender → glTF/GLB

每通道导「中性+仅该滑块拉满」两态 → Blender 做差成 morph → **glTF 导出勾 Shape Keys（→ morph target）**；**A-pose**；米制。

### 5.4 命名与对齐契约

身体 prim `Body`、衣服 `Garment_<assetId>`；morph 通道逐一同名；单一 UV set、材质槽可替换。

### 5.5 品类清单（taxonomy）

库内可用 conforming Mesh 集合 = FR-4 分类器标签空间（闭集）。

### 5.6 UV 模板 / 语义区域（本管线承重墙）

- 每件衣服在 **Blender 阶段烤 seam-aware 固定 UV**：接缝藏腋下/侧缝/内裆；UV 岛尽量连续。
- 随资产出 segmentation map（标 FrontChest/Back/Sleeve…）供 §6 约束/填充。
- 贴图外扩 padding 避免采样白缝。

### 5.7 视觉风格

零售模特：MakeHuman 身体 + 哑光材质 + 好打光；可无脸/极简脸 + 光头/造型发。写实脸 = v2（嫁接头，MetaHuman 仅「头捐赠者」候选，见 `docs/backlog.md`）。

### 5.8 许可合规

MakeHuman CC0 无条件；排除 Daz（按件 Interactive）、SMPL（商用禁止）；CC4 捏人触发 Enterprise；MetaHuman 2025-06 起可用于其它引擎（<100 万美元免费），仅作头候选。「免费」≠「非商用」。

### 5.9 资产验收（A–E，换 WebGL 对等）

身体+衣服带同名 morph；一权重同驱两者；拉满不穿模；帧率可用；运行时可换 texture。

## 6. AI 纹理管线与 Provider 抽象

### 6.1 本期纹理 = 一档（对齐固定 UV）

- 前提：贴图必须画在 UV 空间里（对齐 Mesh 摊平布局），不是把平铺照糊上去。
- 一档流程：衣柜图片 → 视觉理解提「品类+主色+图案类型」→ 贴图 = 主色/可平铺图案，落语义区域/整件 → 对齐固定 UV → 贴 Mesh。
- 整件统一色/图案时**无需合成器**（tileable 直接铺 UV）；按语义区域分别填时用**轻量合成器**（Canvas 2D 或 shader）。
- 重型 Canvas 合成 + 设计文档 JSON + 重渲染 = 以后要在 App 里改色/图案不重调 AI 时才加，本期不做。

### 6.2 语义区域 → UV mask

区域 id 大驼峰、每品类固定集合（§5.6）；一档按区域取色/铺图案，天然对齐、方向由模板定死。

### 6.3 质量边界与缝隙

seam-aware UV + padding + 可平铺图案 → 避免缝/错位/方向乱；几何边缘用 body-hiding+push-out；不复刻精确印花/logo（A-4）。此为可行性文档的「AI 纹理对齐 UV = 中高风险」，靠一档管住。

### 6.4 Provider 抽象（两类能力）

| 能力           | 输入→输出                  | 有后端                                | 无后端                |
| -------------- | -------------------------- | ------------------------------------- | --------------------- |
| 衣服理解/分类  | 图片→{品类,主色,图案}      | ProxyProvider→Go→gRPC→Python(qwen-vl) | Direct/Mock           |
| 纹理生成(一档) | {品类,色,图案,UV模板}→贴图 | 后端/引擎 或 前端程序化装配           | 前端程序化装配 / mock |

> 一档纹理很大程度是**前端程序化装配**；AI 主要在「衣服理解」这步。

### 6.5 缓存

贴图按「品类+色+图案+UV模板」键缓存。

## 7. 数据模型与存储（两版本）

### 7.1 存储策略

有后端=现有后端/服务端；无后端=**IndexedDB**；大文件走文件/对象存储或本地，库里只存路径/引用。

### 7.2 概念实体

BodyModel｜GarmentAsset（品类/slot/glTF 路径/UV 模板/语义区域）｜TextureSpec（品类+主色+图案+UV模板引用+贴图路径）｜Outfit｜AssetIndex（taxonomy）｜UserArchive。

### 7.3 与 2D 已有数据

尽量复用 2D 的衣橱/账户结构（分支 `try-on-2d` 的 `app/src/api/types/*.d.ts`、`stores/wardrobe.ts`），扩展而非另起。

## 8. 后端与运行模式（两版本 = 差异集中处）

### 8.1 有后端版（薄代理）

复用 Go 后端 + Python AI 引擎（Veslune，gRPC），加 3D 专属能力：衣服理解（可复用 qwen-vl 单品识别）、一档纹理装配。Key 在服务端。

### 8.2 无后端版（方案 A）

前端直连模型 / **mock**（后端无 3D 纹理接口时先 mock）；无后端依赖 → 供 iOS 移植最干净；用户自带 Key（移植 iOS 后存 Keychain）或纯 mock。

### 8.3 Provider 接口契约

两版本实现同形状（§6.4）；`tryon3d-core/providers` 只定义接口，各 app 注入实现。

### 8.4 隐私/密钥

有后端=Key 服务端、不进客户端；无后端=用户自带 Key / mock。发送图片前同意/披露（复用 2D 机制）；基本不上传真人照片。

## 9. 非功能需求

- **NFR-1 性能**：捏人/换装/旋转 ≥60fps（低端 ≥30）；纹理生成有进度态。
- **NFR-2 可靠性**：云端超时/重试/降级；AI 失败保留上一有效纹理/纯色；无后端版离线可用。
- **NFR-3 隐私合规**：PIPL/GDPR；发送前披露；一键删除本地数据；无后端版数据留本机。
- **NFR-4 兼容性**：WebGL2（iOS 15+ / 现代浏览器矩阵）；无 WebGL2 时提示。
- **NFR-5 可维护**：monorepo + 接缝隔离；`tryon3d-core` 可单测。
- **NFR-6 上架合规**：WKWebView 原生壳 + 真原生功能规避 4.2。
- **NFR-7 成本**：有后端走服务端计量；无后端走用户 Key；一档纹理 AI 调用少。
- **NFR-8 包体/内存**：控 glTF/贴图体积；留意大纹理在 WKWebView 的内存上限。

## 10. 里程碑

M0 资产管线（glTF）→ M1 `app` 加 WebGL2 捏人+透视旋转 → M2 一档纹理（接后端/mock）→ M3 换装+存档 → M4 抽 `tryon3d-core`+建 `app-standalone` → M5 iOS 移植准备（对接 `docs/SRS-3D-tryon-native.md`）。

## 11. 风险登记

| ID     | 风险                      | 缓解                                                  |
| ------ | ------------------------- | ----------------------------------------------------- |
| RISK-1 | morph 穿模                | 同名通道+单权重广播；body-hiding/push-out             |
| RISK-2 | 一档纹理对齐 UV 的缝/方向 | seam-aware UV+padding+可平铺图案；不复刻精确印花      |
| RISK-3 | 多通道叠加过度形变        | 软上限/联动约束；通道集最小化                         |
| RISK-4 | 3D 美术人力               | 提前锁外包；MVP 衣服 3~5 件                           |
| RISK-5 | 两版本分叉维护成本        | 90% 收进 `tryon3d-core`；差异只在 providers/存储/鉴权 |
| RISK-6 | App Store 4.2 纯套壳被拒  | 原生壳+真原生功能                                     |
| RISK-7 | WKWebView 性能/大纹理内存 | 静态单角色负载轻；控纹理尺寸                          |

## 12. 附录

- **A 需求追踪矩阵**（FR ↔ C/风险/里程碑）。
- **B 关键 Web/WebGL2 API**：three.js `GLTFLoader` / `morphTargetInfluences` / `Texture`·`CanvasTexture` / `PerspectiveCamera`；IndexedDB；WKWebView bridge。
- **C 术语**（见 §1.3）。
- **D 引用来源**（同分支 `docs/`）：`docs/feasibility-3D-tryon.md`、`docs/backlog.md`（原产于分支 `claude/festive-wozniak-6pcz8e`）；2D AI 内核见分支 `try-on-2d`。

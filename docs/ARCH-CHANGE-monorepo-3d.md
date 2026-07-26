# 架构变更说明 · 加「3D 试衣」线 + 仓库 Monorepo 化

> 📣 **给所有在本项目工作的对话/协作者**。
> **文档成熟度**：说明性文档（随决策更新）｜**决策图例**：🔒 已批准冻结 ／ ☐ 待议。
> **落地状态**：设计**已批准（🔒）**，**代码尚未落地**——代码改动在另开对话做。
> **文档归位**：本文与相关权威文档统一收于合并分支 `claude/docs-hub` 的 `docs/`；下列引用为同分支相对路径。
> 编写：2026-07。

## 1. 一句话
在同一仓库把现有 2D 产品扩成**两个大版本**并加入 **WebGL2 3D 试衣**线：
- **有后端版**（现有 `app/`，复用 Go 后端 + Python AI 引擎）
- **无后端版**（新增 `app-standalone/`，AI 前端直连/mock，供移植 iOS 原生）

两版本共享约 90% 的 3D 代码，只在「AI / 存储 / 鉴权」层分叉。为此把仓库改造成 **pnpm monorepo**。

## 2. 现状澄清
- **当前不是 monorepo**：根**无** `pnpm-workspace.yaml`；`app/pnpm-workspace.yaml` 仅含 pnpm 的 `allowBuilds` 设置、无 `packages:`；`app/package.json` 无 `workspaces`。
- **根已存在 `package.json` + husky + lint 工具链**——见 §3「改造须知」。
- 现有 `app/`（Quasar+Vue+TS）、Go 后端、Python AI 引擎（Veslune，gRPC）**都保留、不删**——`app/` 成为「有后端版」，被扩展而非替换。

## 3. 目标结构（🔒）
```
仓库根 (新建 pnpm-workspace.yaml；保留合并现有 package.json)
├── packages/
│   └── tryon3d-core/           两版本共享（约 90% 3D 代码）
│       ├── engine/             WebGL2：加载 glTF、morph 驱动身材、换 texture、透视相机
│       ├── sculpt/             捏人逻辑（身材通道权重、骨骼缩放）
│       ├── texture/            一档纹理装配（主色/可平铺图案 → 对齐固定 UV）
│       ├── providers/          ★只定义接口 AIProvider / TextureGenProvider（不实现）
│       └── ui/                 共享 Vue 组件（捏人面板、旋转、衣橱选件）
├── app/                        有后端版（现有应用扩 3D 线）
│   └── src/providers/          BackendProxyProvider（HTTP 调 Go 后端；gRPC 在后端↔AI 引擎）
└── app-standalone/             无后端版（供 iOS 移植）
    └── src/providers/          DirectProvider / MockProvider + IndexedDB
```
> ⚠️ **改造须知（须遵守）**：仓库**根已存在 `package.json`（含 husky / lint / 脚本）**——monorepo 化时**合并保留、不得覆盖**：新增根 `pnpm-workspace.yaml` 声明 `packages/*` 与 `app*`，把现有根依赖/脚本纳入 workspace。
> ⚠️ **与 SRS 对齐**：**正交测量 = ☐ 待评估**（本期用透视，不入 core）；**重型 texture-composer / 设计文档 JSON = 可选·后续**（本期 core 只做一档 `texture/` 装配）。详见 `docs/SRS-3D-tryon-web.md` §3.2 / §4.2 / §6。

## 4. 核心原则：两版本只在「接缝」处分叉
共享 `tryon3d-core`；差异只落在各 app 的 `providers/` + 存储 + 鉴权：

| 维度 | 有后端版 `app/` | 无后端版 `app-standalone/` |
|---|---|---|
| AI | `BackendProxyProvider` → HTTP → Go → gRPC → Python AI 引擎 | `DirectProvider` / `MockProvider` |
| 存储 | 现有后端/服务端 | IndexedDB |
| 鉴权 | 现有 auth | 无 / 本地 |
| 引擎·捏人·纹理·UI | 共享 `tryon3d-core` | 共享 `tryon3d-core` |

> Provider 接缝：把会变的关进接缝背后的实现，不变的只写一遍。无后端版因此**无一行后端依赖 → 移植 iOS 最干净**。

## 5. 对其他对话/协作的影响
- 别再假设「单个扁平 app」。3D 通用能力进 `packages/tryon3d-core`，别塞进某个 app 的 `src/`。
- 后端相关代码进 `app/`；无后端/mock 特定代码进 `app-standalone/`。
- 现有 2D 功能与 `app/` 结构不动（此变更是「加线 + 抽共享包 + 保留合并根工具链」，不是重写）。

## 6. 落地节奏（🔒）
1. 先在 `app/`（有后端版）加 WebGL2 3D 跑通（复用现有 api/stores/auth；纹理接口没有先 **mock**）。
2. 抽 3D 通用部分到 `packages/tryon3d-core`（建 workspace、合并根工具链）。
3. 新建 `app-standalone/`，组合 core + Direct/Mock provider + IndexedDB。
4. 无后端版移植 iOS 原生（对应 `docs/SRS-3D-tryon-native.md`）。

## 7. 决策状态
- 🔒 加 3D 线、两大版本、共享 `tryon3d-core`、pnpm monorepo。
- 🔒 3D 渲染 = WebGL2；资产 = glTF/GLB。
- 🔒 后端两版本都要：有后端=薄代理（复用 Go/Python）；无后端=方案 A（直连/mock，供 iOS）。
- 🔒 纹理本期 = 一档；展示 = 透视相机。
- ✅ **Web 第一阶段 SRS 已写**：`docs/SRS-3D-tryon-web.md`（覆盖两版本、一档、透视、glTF、monorepo）。
- ☐ 正交测量、二/三档纹理、重型 texture-composer —— 待评估 / 后续。
- ☐ `tryon3d-core` 详细包结构/接口契约 —— 待代码对话细化。

## 8. 关联文档（同分支 `docs/`）
- `docs/SRS-3D-tryon-web.md` —— 第一阶段·Web SRS（覆盖两版本）。
- `docs/SRS-3D-tryon-native.md` —— 第二阶段·原生（无后端版移植目标；原产于分支 `claude/3d-tryon-srs-svsasl`）。
- `docs/backlog.md`、`docs/SRS-kickoff.md` —— 产品前提/决策（原产于分支 `claude/festive-wozniak-6pcz8e`）。
- 2D AI 内核（**留在分支 `try-on-2d`**）：`Veslune-Frontend_DEMO/VestiCore_demo/docs/AI_KERNEL_IMPLEMENTATION.md`。

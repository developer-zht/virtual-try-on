# 代码开工 Kickoff — iOS ① 正交相机 spike + ② 工程脚手架

> **用途**：写代码是大活，建议**开新对话**（干净上下文）。把本文末尾「开场白」代码块整段复制到新对话即可启动 **任务①（RISK-10 正交相机/投影过渡 spike）** 与 **任务②（iOS 脚手架）**。
> 本文与 SRS 配套：SRS 在分支 `claude/3d-tryon-srs-svsasl` 的 `docs/SRS-3D-tryon.md`。
> 这两个任务**不依赖 M0 正式资产**——用 spike 已产出的 `scene.usdz` 当占位即可起步。

---

## 前置：先读这些（新对话里）
- `docs/SRS-3D-tryon.md` —— 本产品 SRS（重点 §4 技术架构、§5.2/§5.4 契约、§7.2 SwiftData、FR-1/FR-6 锁视角测量、RISK-10）
- `docs/realitykit-spike-app-guide.md` —— 建 Xcode 工程、RealityKit/ECS 心智、最小可跑代码、白方块急救
- `docs/asset-pipeline-makehuman-to-usdz.md` —— spike 占位资产 `scene.usdz` 怎么来的（已验证）
- `docs/spike-week1-blendshape-pipeline.md` —— Spike A–E 结论（不要再质疑这些已成立的技术点）

## 必须遵守的 5 个冻结契约（开工前已定，照此写不返工）
1. **§5.2 身材通道名**：`k_height`/`k_legLength`/`k_armLength`/`k_shoulder`（比例类，ARKit 可 seed）+ `k_weight`/`k_muscle`/`k_chest`/`k_waist`/`k_hip`（围度类，手动），`k_faceWidth` 可选。
2. **§5.4 命名契约**：身体 prim `Body`、衣服 prim `Garment_<assetId>`、base color 槽 `mat_basecolor`、单一 UV set `st`、米制 + Y-up。
3. **§5.5 taxonomy**：品类 = 库内 Mesh 集合 = 分类标签空间（脚手架阶段先留枚举占位）。
4. **§6.1 设计文档 JSON**：纹理真相是 Design Doc，PNG 是渲染产物（脚手架阶段先建模型，不接 AI）。
5. **§7.2 SwiftData 实体**：`BodyModel`/`GarmentAsset`/`TextureDesignDoc`/`Outfit`/`OutfitItem`/`ConsentRecord`（字段见 SRS §7.2）。

## 硬依赖
- **Mac + Xcode 16+**（含 iOS 18 SDK + Reality Composer Pro）。
- **一台 iOS 18+ 真机**（`BlendShapeWeightsComponent` 与 `OrthographicCameraComponent` 运行时验证需真机；模拟器不可靠）。
- spike 占位资产 `scene.usdz`（身体+衣服各带 `k_weight`，来自资产管线文档）。

---

## 任务① — RISK-10 spike：正交相机 + 投影过渡（第一段代码，先做）
**目标**：消除 FR-1 测量视图 / FR-6 仅剩的技术不确定性。
- [ ] 确认 **`OrthographicCameraComponent`** 在 iOS 18 真机可用、能渲染出无透视的正交视图。
- [ ] 实现一个「锁视角」toggle：透视相机 ⇄ 正交相机切换。
- [ ] **投影类型不能线性补间** → 试「遮罩式瞬切」（中点瞬切 + 短交叉淡化/轻微缩放）把切换藏住，调到手感顺滑。
- [ ] 正交态下叠一层 **SwiftUI 矢量标尺 overlay**（`Canvas`/`Path`），随缩放重算刻度、放大保持锐利。
- **验收**：真机上锁/解锁切换顺滑无突兀；正交态标尺刻度线性正确、缩放后更细且清晰。
- **若 `OrthographicCameraComponent` 不可用**：记录现象，退到「透视相机拉远 + 窄 FOV」近似方案并评估标尺误差，回写 RISK-10。

## 任务② — iOS 脚手架（与①可并行/接续）
**目标**：可在真机跑、用滑块驱动占位模型形变、SwiftData 模型骨架就绪。
- [ ] 新建 Xcode App 工程（**普通 App 模板、非 AR**），**Minimum Deployments = iOS 18.0**，SwiftUI。
- [ ] `RealityView` 加载 `scene.usdz`；`findEntity(named:"Body")` / `"Shirt"`（占位资产用 spike 命名；正式资产将是 `Garment_<assetId>`）。
- [ ] **`SculptEngine.apply(weights:)`**：把一组权重**同时写入身体与在穿衣服**的 `BlendShapeWeightsComponent`（单一权重源广播；值类型改完写回 `entity.components.set`）；按通道名用 `BlendShapeWeightsMapping` 定位、不硬编 index。
- [ ] 折叠面板滑块（先接通已有的 `k_weight` 一个通道，结构按 8~10 通道预留）。
- [ ] **§7.2 SwiftData 实体骨架**落地（`@Model` 定义 + ModelContainer 接好；先不接网络/AI）。
- **验收**：真机拖滑块身体+衣服一起形变（复现 Spike B/C）；SwiftData 能建/存/取 `BodyModel`。

## 工程约定
- **分支**：在你为代码新建的分支上开发（与 SRS 文档分支 `claude/3d-tryon-srs-svsasl` 分开）；按新对话的分支指示来，未经许可不要推别的分支。
- **多 Target**：①spike 建议独立 Target（如 `OrthoSpike`），与正式工程隔离（用完即弃）；②脚手架是正式工程起点。
- **关注点分离**：引擎（`SculptEngine` 等）零 SwiftUI、可单测；UI 只读状态、发意图（与 AIKit/CFD 同一纪律）。
- AI 那条腿（understand/纹理生成/薄代理）**本阶段不做**——留到 M2，且依赖 AIKit 通用性拍板。

---

## 开场白（复制到新对话即可启动 ①②）
```
我要为【独立的 iOS 3D 虚拟试衣 App】写第一段代码：① 正交相机/投影过渡 spike（RISK-10），
② iOS 工程脚手架。先读分支 claude/3d-tryon-srs-svsasl 上的：
- docs/code-kickoff-ios.md（本任务单，含两任务的验收与冻结契约）
- docs/SRS-3D-tryon.md（重点 §4 架构、§5.2/§5.4 契约、§7.2 SwiftData、FR-1/FR-6、RISK-10）
- docs/realitykit-spike-app-guide.md（建工程 + 最小可跑代码 + 白方块急救）

不要质疑已成立的技术点：Spike A–E 已真机验证（usdz 含 blendshape、滑块驱动身体、
身体+衣服不穿模、帧率、运行时换 base color）。

按 code-kickoff-ios.md 的任务①→②推进：
① 先做正交相机 + 投影过渡 spike，确认 OrthographicCameraComponent 在 iOS 18 可用、
  把「遮罩式过渡」手感调出来、叠 SwiftUI 矢量标尺；
② 再起脚手架：iOS18 工程 + RealityView 加载 scene.usdz + SculptEngine.apply 权重广播
  + 折叠面板滑块 + §7.2 SwiftData 实体骨架。用现成 scene.usdz 当占位，不等正式资产。

我是产品方+学习者、非工程师：先大白话讲「在干嘛/为什么」再写代码，关键选型交我拍板。
开发分支按本对话的分支指示来。
```

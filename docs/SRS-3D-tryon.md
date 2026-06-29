# 软件需求规格说明书（SRS）— 3D 虚拟试衣 App

> 产品（暂定名）：**3D 试衣分身 / FitTwin 3D**（暂定，待定名）
> 文档版本：v0.1（草案，待评审）
> 编写日期：2026-06-29
> 适用平台：iOS（仅 iOS），**最低 iOS 18**
> 状态：MVP 需求基线

> ⚠️ **归属提醒**：本文件描述的是一个**全新、独立**的产品（3D 静态捏人换装），与本仓库主线产品 **StyleTwin（2D 纸娃娃）无业务关系**。目前暂存于本仓库 `docs/` 仅为协作方便；**正式立项后建议迁出到独立仓库**（见 `docs/3D-tryon-index.md`「仓库策略」）。

---

## 1. 引言

### 1.1 目的
本文件定义「3D 试衣分身」App 在 **MVP 阶段** 的软件需求，作为产品、设计、研发、测试的共同基线与验收依据。书写颗粒度：每条功能需求带**验收标准（AC）**；资产管线与 AI 管线写到**契约级**（命名、通道、接口形状），不下钻到代码实现。

### 1.2 产品背景与范围
**一句话**：用户**捏一个近似自己身材的 3D 模特** → **用文字或图片描述衣服** → **AI 只生成纹理（优先 base color）** 贴到**预制 conforming 服装组件**上 → **静态、可旋转**地展示与换装。

**明确边界（本期不做）**：不做动画、不做 AR、不做「文本/图片 → 3D mesh」生成、不做面向真实体型的精确试穿、不做法线/粗糙度等附加贴图生成。

本产品的全部技术不确定性已由 Spike 真机验证消除（见 §2.6 与 `docs/spike-week1-blendshape-pipeline.md`），可行性结论为**有条件 GO**（见 `docs/feasibility-3D-tryon.md`）。

### 1.3 术语定义
| 术语 | 含义 |
|------|------|
| Blend Shape / Morph 通道 | 网格的一份「往某方向怎么变形」的数据；权重 0→1 连续插值，可叠加。运行时改权重即改形状，无需重导模型 |
| 身材通道（Body channel） | 驱动身材的 morph 通道，如 `k_weight`/`k_height`，本产品终态约 8~10 个 |
| Conforming 服装 | 为同一基础人体设计、能随其身材形变而贴合的服装网格 |
| 分开法 | 资产架构：**1 个身体 + N 件衣服各为独立文件**，各带与身体**同名**的 morph 通道，运行时组合、可换装（产品采用） |
| 合并法 | 身体与衣服合成单一网格；**仅 spike 验证用**，产品不用 |
| body-hiding / push-out | 残余穿模兜底：收缩/隐藏被遮挡的身体面 + 衣服略微外扩 |
| UV 模板 / 语义区域 | 服装 UV 展开图上预定义的区域（如 FrontChest），AI 纹理按区域受约束生成 |
| segmentation map | UV 模板的分区图，作为 AI 生成的空间约束 |
| 设计文档（Design Doc / JSON） | 一套搭配/纹理的**结构化真相**；PNG 纹理是它的**渲染结果**。详见 §6 |
| 衣服品类（taxonomy） | 资源库支持的有限服装类别集合 = 库内可用 Mesh 集合；分类器的标签空间（见 §5.5、§3.4） |
| Provider | 被抽象封装的一类 AI 能力（理解/分类、纹理生成），接口固定、实现可换，避免厂商锁定 |
| 薄代理（Thin Proxy） | 后端的最小职责：转发 AI 调用、隐藏密钥、限流计费；不承载业务逻辑 |
| AIKit / AIKitCore | 本作者跨 App 复用的 AI 管道 Swift Package（零业务、MIT、不沾 GPL），见 `docs/cross-app-ai-sharing.md` |

### 1.4 参考文档
- `docs/3D-tryon-index.md` — 总索引与进度
- `docs/feasibility-3D-tryon.md` — 可行性结论（GO）、build-vs-buy、许可核对、风险、最低 iOS
- `docs/spike-week1-blendshape-pipeline.md` — Spike 真机验证（A–E 全过）
- `docs/asset-pipeline-makehuman-to-usdz.md` — 资产管线 + 多通道路线图 + 工具解耦
- `docs/realitykit-spike-app-guide.md` — RealityKit / 工程
- `docs/spike-1b-clothes-walkthrough.md` — 身体+衣服验证流程
- `docs/cross-app-ai-sharing.md` — 跨 App AI 共享层（AIKit）约定
- `AIKit/README.md` + `AIKit/Sources/AIKitCore/`（`AIProvider`/`AIModels`/`ChatSession`/`AIConsent`）— AIKit 共享层的**实际代码**，本 SRS §4.5/§6.4 复用其接口契约

### 1.5 约定
- 优先级采用 MoSCoW：**Must / Should / Could / Won't（本期不做）**。
- 需求编号：功能需求 `FR-n`，非功能需求 `NFR-x`，外部接口 `IF-x`，约束 `C-x`，假设 `A-x`，风险 `RISK-x`。

---

## 2. 总体描述

### 2.1 产品愿景与定位
做一款**「捏个像自己的 3D 模特、用一句话或一张图换上衣服、转着看」**的轻量娱乐 + 穿搭可视化工具。情绪钩子 = 「3D 的我」；玩法 = 「描述即换装」；与 2D 纸娃娃路线的差异在于**真三维、可旋转、衣服随身材贴合**。

### 2.2 功能概览
```
①捏身材(手动滑块/骨骼缩放)  ──┐
②ARKit 自动量身(可选,本机)  ──┴→ 近似自己身材的 3D 模特
                                      │
③文字 / 图片 描述衣服 ──→ ④衣服理解&分类 ─→ 从资源库取对应 conforming Mesh
                          └─→ 纹理生成(AI, 仅 base color) ─→ 贴到该 Mesh 的 UV
                                      │
                                      ▼
⑤换装(分开法: 同名 morph 同权重驱动, 互斥替换) → ⑥360° 静态旋转展示
                                      │
               ⑦设计文档(JSON 真相) ←→ 多数编辑=重渲染, 少数=重调 AI
                                      │
               ⑧模特 / 衣橱 / 纹理 / 搭配 存档与管理
```

### 2.3 用户角色与特征
| 角色 | 特征 | 主要诉求 |
|------|------|----------|
| 尝鲜型用户 | 喜欢捏人/3D 小玩具 | 捏个像自己的模特、转着看 |
| 穿搭好奇用户 | 想看「这件衣服穿身上大概啥样」 | 用一句话/一张图快速换装预览 |
| 分享型用户 | 爱出片 | 导出旋转视角截图分享 |

### 2.4 运行环境
- **客户端**：iOS App（SwiftUI + RealityKit），iPhone，**最低 iOS 18**。
- **服务端**：自有**薄代理**后端（转发 AI、隐藏密钥、限流计费）。
- **AI 能力**：以 Provider 形式接入第三方或自托管模型（见 §6）。
- **本机能力**：ARKit（可选自动量身，仅静态参数、不取动作）。
- **网络**：纹理生成与衣服理解依赖云端；捏人、换装、旋转展示**全部本机离线可用**。

### 2.5 设计与实现约束
- **C-1** 仅 iOS，**最低 iOS 18**（运行时 blendshape 的受支持公共 API `BlendShapeWeightsComponent` 自 iOS 18 起；2026 年定此基线无副作用）。
- **C-2** 捏人 = **Blend Shape/Morph 运行时权重驱动 + 骨骼缩放**；**AI 只生成 texture，绝不生成 mesh**。
- **C-3** 资产架构 = **分开法**（1 身体 + N 衣服，各带同名 morph 通道，运行时组合）；合并法仅 spike 用，产品不用。
- **C-4** 资产主线 = **MakeHuman（导出 CC0，无条件商用/免费）**；**排除 Daz**（按件 Interactive License）、**排除 SMPL/SMPL-X**（商用禁止）；**CC4 仅备选**，且「捏人滑块」可能触发 Enterprise License，落地前须书面确认。**注意「免费 App ≠ 自动非商用」**：本 App 免费、不商用，但各家许可对「免费」放宽不一致（详见 §5.6 / `feasibility-3D-tryon.md` §5b）。
- **C-5** AI 能力须做 **Provider 抽象**，模型/厂商可热替换；并**复用 AIKitCore**（见 §4.5 / §6.4）。
- **C-6** AI Key **不进客户端**，统一走后端薄代理。
- **C-7** 纹理生成**优先只产 base color**；法线/粗糙度本期不做（用预制或留空）。
- **C-8** **本期不做**：动画、AR、文本/图片→mesh、真实体型精确试穿。
- **C-9** ARKit 自动量身**仅取人脸/人身静态参数、不取动作**，且**全程本机处理、仅留导出参数**；不支持机型回退手动捏人。
- **C-10** 须满足上架地区个人信息保护法规（PIPL / GDPR 等）。

### 2.6 假设与依赖
- **A-1（既定技术前提，勿再质疑）** Spike 已真机验证：**A** usdz 含 blendshape ✅；**B** 真机滑块驱动身体 ✅；**C** 身体+衣服一起变形不穿模 ✅；**D** 帧率可用 ✅；**E** 运行时换衣服 base color ✅。本 SRS 在此之上展开，不重证这些点。
- **A-2** 依赖第三方/自托管 AI（多模态理解、图像生成）的可用性、配额与价格。
- **A-3** 图像生成对「颜色/图案/材质观感」可较好保真，但 **不保证还原精确剪裁/logo/对称图案**（款式由预制 Mesh 承担）。
- **A-4** **3D 美术人力是隐性大头**：conforming 服装的 morph 对齐、UV 模板设计、烘焙需专职/外包 3D 美术（见 `feasibility-3D-tryon.md` §5）。MVP 衣服件数控制在 3~5 件。
- **A-5** ARKit 自动量身依赖具备相应传感器/算力的机型（人脸追踪需 TrueDepth/较新机型；身体追踪需 A12+）。
- **A-6** 用户设备具备基本网络（用于云端生成步骤）。

---

## 3. 功能需求

> 每条含：优先级、描述、输入/输出、验收标准（AC）。

### FR-1 手动捏身材（参数化模特）— **Must**
- 描述：用户通过**折叠面板里的一组滑块**调身材；每个滑块驱动一个 morph 通道（§5.2），并辅以**骨骼缩放**（无版本门槛）。所有通道权重在运行时实时生效，**人体与所穿衣服同时形变**。
- 输入：用户对各通道的权重设定（0~1，或映射到直观区间）。输出：一个参数化模特状态（一组通道权重 + 骨骼缩放参数）。
- AC：
  - 拖动任一滑块，模特**实时**形变，帧率可用（见 NFR-1）。
  - 终态身材通道集合落在 §5.2 定义的 8~10 个之内；面板支持折叠分组。
  - 模特状态可命名保存、跨会话复用（见 FR-8）。
  - 多通道叠加时若出现过度形变（见 RISK-5），允许设软上限或联动约束。
- **捏人视图 —— 锁视角 → 正交测量态**（「锁视角」icon toggle，带过渡动画）：
  - **解锁态（默认）**：透视相机、自由旋转/缩放、**不显示标尺**（即 FR-6 展示态）。
  - **锁定态（测量）**：点「锁视角」icon → 过渡动画 → **直接进入正面正交视图**，显示**标尺**（SwiftUI 矢量 overlay）+ **实时尺寸读数**（身高/肩宽/腿长…）；**旋转锁定**，保留缩放 + 捏滑块 + **数字输入框**。再点解锁 → 回透视自由旋转。
  - **命名视图箭头循环**：锁定态用**前/后箭头循环**在 `正面 → 背面 → 左侧 → 右侧` 间切换（动画旋转）；**俯视（top）序列留位、本期不做**。
  - **为何用正交**：只有正交投影下「屏幕像素 ↔ 真实厘米」为固定比例，标尺才准；放大 = 缩小正交可视范围 → 刻度变细、读数更精确。**标尺管「看比例」、数字框管「定精确值」**，互补。
  - **数字来源**：实时尺寸**复用 FR-2 的 B-2 标定表**（morph 权重 ↔ 真实尺寸），零额外资产，与 ARKit 量身互相印证。
  - **待 spike 确认（见 RISK-10）**：`OrthographicCameraComponent` 在 iOS 18 的可用性；透视↔正交投影类型不能补间，需「遮罩式瞬切」过渡的手感。
  - AC：解锁态可自由旋转；锁定态旋转锁定、仅命名视图箭头可切换；标尺/读数与当前滑块状态实时一致。

### FR-2 ARKit 自动量身（可选）— **Should**
- 描述：用户可选用 ARKit 在**本机**采集**静态**人身/人脸参数，**自动预填**身材滑块；用户随后可手动微调。**不采集动作**。
- 能力边界（重要）：
  - ARKit **身体追踪**给的是**骨架（关节）+ 估算身高**，可反推**比例类通道**：`k_height`/`k_shoulder`/`k_legLength`/`k_armLength`。
  - **围度类通道**（`k_weight`/`k_muscle`/`k_chest`/`k_waist`/`k_hip`）骨架中**不含该信息**，**仍由用户手动设定**（不尝试从骨架臆测）。
  - 人脸网格仅在脸通道（`k_faceWidth` 可选）启用时用于拟合，非必需。
- 输入：ARKit 会话采集结果（本机）。输出：一组**预填**的身材通道权重（写入 FR-1 的模特状态）。
- AC：
  - 全程**本机处理**，**不上传**人像/扫描数据；仅持久化导出的数值参数（见 NFR-3）。
  - 不支持机型/采集失败时**自动回退**到 FR-1 纯手动，不阻断主流程。
  - 自动结果**可被用户手动覆盖**；明示「这是估算值，可调整」。
  - 拟合误差在可接受范围（见 RISK-4 的缓解）；围度通道不被自动值污染。
- **资产/模型前提（自动量身能成立的条件）**：ARKit 给的是「骨架关节 + 估算身高」（真实米制），不是身材胖瘦；流程是 `ARKit 量尺寸 → 反解 morph 权重 → 驱动模型`。反解成立要求 base 资产满足：
  - **B-1 中性基准已知**：权重全 0 的模特，其真实尺寸（身高/肩宽/腿长/臂长，单位米）已知——反解需「知道 0 时量出来是多少」。
  - **B-2 每通道标定表**：对 `k_height`/`k_shoulder`/`k_legLength`/`k_armLength` 各预先标定「权重 0→1 = 某尺寸变化多少」，**随资产一起烘焙**，反解时查表把测量值换成权重。
  - **B-3 单调、近似解耦**：每个比例通道主要只改自己那个尺寸且单调，避免反解耦合不稳。
  - **B-4 米制 + 固定 rest pose + 可定位标志点**：米导出、与测量一致的 T/A-pose；资产的骨架关节/预定义顶点能对上 ARKit 的头顶/肩/髋/膝/踝/腕，才能比对尺寸。
  - **B-5 围度与比例解耦**：围度通道（`k_weight`/`k_muscle`/`k_chest`/`k_waist`/`k_hip`）ARKit 量不到，自动量身**绝不写入**它们（保持手动）。
  - **B-6 有效范围 + clamp**：每通道标注有效权重区间；超范围（特别高/矮）截断到最接近值（「近似身材」接受此近似）。
  - **B-7 衣服随动**：设好比例权重后，衣服靠 §5.4 同名通道契约自动跟随，无需额外条件。
  - 配套软件：反解/拟合器（查标定表 + 多帧平滑去抖 + 置信度低则回退）；围度留手动。

### FR-3 纹理生成：文字 + 图片输入 — **Must**
- 描述：用户用**文字描述**或**上传一张衣服图片**（或两者）来生成贴到所选服装 Mesh 的纹理。**AI 只产 base color**。图片输入被拆解为两路：**款式/品类 → 选 Mesh（见 FR-4）**；**颜色/图案/材质观感 → 生成纹理**。
- 输入：文字 prompt 和/或参考图片；目标服装的 UV 模板 + 语义区域/segmentation map（§5.5）。输出：对齐 UV 的 base color 纹理 PNG + 写入设计文档 JSON（§6）。
- AC：
  - 文字、图片、文字+图片三种入口均可触发生成；有进度态、失败可重试。
  - 生成纹理在**颜色/图案/材质观感**上与输入相符；**不承诺**还原精确剪裁/logo/对称图案（A-3）。
  - 生成结果按语义区域受约束（接缝/区域不明显错位达可展示标准）。
  - 含人像的参考图：优先在**本机**抠出衣服区域再上传，并明示披露（NFR-3）。
  - 生成的纹理可保存、可作为后续重渲染的输入（FR-7）。

### FR-4 衣服理解与选件（品类识别 → 取 Mesh）— **Must**
- 描述：把用户的文字/图片输入归类到**资源库支持的有限品类（taxonomy，§5.5）**中最接近的一类，从资产索引取出对应 conforming Mesh。这是**闭集分类**：只能「穿」库里有 Mesh 的品类。
- 输入：文字或图片。输出：`garmentCategory`（枚举）+ 子属性（裙长/袖型/版型…）写入设计文档 JSON；选定的 Mesh 引用。
- AC：
  - 文字「连衣裙」/ 图片为裙子 → 取**裙子 Mesh** 而非裤子 Mesh。
  - 分类标签空间**严格等于** §5.5 的 taxonomy = 库内 Mesh 集合。
  - 库内**无匹配品类**时：回退到最接近的可用品类，或明确提示「暂不支持该类」，不静默选错。
  - 子属性若有对应 Mesh 变体则选变体，否则仅用于影响纹理生成。
  - 该能力作为独立 Provider（衣服理解/分类），与纹理生成 Provider 并列（§6.4）。

### FR-5 换装（分开法资产组合）— **Must**
- 描述：从衣橱选衣服穿到模特上。运行时把**当前身材的同一组通道权重**同时写入【身体】与【所选衣服】的 `BlendShapeWeightsComponent`，使两者一致形变、不穿模；同部位互斥替换。
- 输入：模特状态 + 选中的衣服集合。输出：一套穿好的 3D 搭配。
- AC：
  - 换上某件衣服后，拖身材滑块时**衣服随身体一起变形、无明显穿模**（Spike C 已验证机制）。
  - 同部位互斥（换上衣替换原上衣）；图层/遮挡顺序正确。
  - 残余穿模用 **body-hiding + push-out** 兜底。
  - 可同时穿戴多件（上装/下装/鞋等不冲突部位）。

### FR-6 模特展示与视图切换（透视旋转 ⇄ 正交测量）— **Must**
- 描述：以静态、可旋转方式查看穿好的模特。视图有两态，由 FR-1 的**「锁视角」icon toggle** 切换、带过渡动画：**透视自由旋转（展示）** ⇄ **正交命名视图（测量，详见 FR-1）**。**不做动画**。
- 输入：当前搭配场景。输出：交互式 3D 视图。
- AC：
  - 解锁态：单指拖动绕竖直轴 360° 旋转、双指缩放，交互流畅（NFR-1）。
  - 与捏人正交测量态由锁 icon **无缝切换**、过渡动画顺滑（透视↔正交手感见 RISK-10）。
  - 可导出当前视角截图用于分享（分享前提示，NFR-3）。

### FR-7 设计文档与编辑（重渲染优先）— **Should**
- 描述：每套纹理/搭配以**设计文档 JSON 为真相**（语义区域 + 参数 + 资产引用），PNG 是其渲染结果。**多数编辑（换色、改区域参数、调图案）= 对 JSON 重渲染**，**不重新调用 AI**；仅当语义内容确需改变时才重调生成 Provider。
- 输入：对设计文档的局部修改。输出：更新后的 JSON + 重渲染的纹理 PNG。
- AC：
  - 改「胸前区域颜色」等编辑**走重渲染**，不触发 AI 计费调用。
  - JSON 与 PNG 一致：从 JSON 可确定性地重建 PNG。
  - 设计文档可版本化、可回退。

### FR-8 模特 / 衣橱 / 纹理 / 搭配 的管理与存档 — **Should**
- 描述：保存并管理用户的模特状态、衣橱中的衣服、生成的纹理、组好的搭配。
- AC：
  - 结构化数据（模特状态、设计文档、资产索引、搭配）存 SwiftData；大文件（纹理 PNG / usdz / AI 图）存文件系统，数据库只存路径（§7）。
  - 支持命名、增删、跨会话复用；空态有引导。
  - 与系统 Files app 不冲突（沙盒 Documents/Caches）。

### FR-9 账户与数据删除 — **Could**
- 描述：可选登录（Sign in with Apple）；提供查看/导出/删除自己数据的入口。
- AC：可一键删除本地数据；若有云端缓存亦可清除（NFR-3）。

### 本期不做（Won't / Out of Scope）
- 动画 / 骨骼动作驱动；AR 试穿；文本或图片 → 3D mesh 生成；面向真实体型的精确试穿与尺码推荐；法线/粗糙度/金属度等附加贴图的 AI 生成；电商购买/比价；社区/社交。

---

## 4. 技术架构

### 4.1 客户端分层
```
SwiftUI（视图/交互：捏人面板、换装、旋转、编辑）
   │  只读状态、发意图
   ▼
应用状态与用例（模特状态机 / 换装用例 / 纹理用例 / 设计文档）
   │
   ├── 捏人引擎     —— 通道权重 → BlendShapeWeightsComponent（身体+衣服广播）
   ├── 换装引擎     —— 分开法组合、互斥替换、body-hiding/push-out
   ├── 纹理管线     —— 设计文档 JSON ↔ UV mask ↔ base color（重渲染优先）
   ├── 资产/存储    —— SwiftData(结构化+路径) + 文件系统(大文件)
   └── 网络/AI      —— Provider 抽象（复用 AIKitCore）→ 后端薄代理
   ▼
RealityKit（ECS：Entity/ModelComponent/Material，Metal 渲染）
```
- 沿用「引擎只算、UI 只画」的关注点分离（与 AIKit/CFD 同一纪律）。

### 4.2 运行时模型组合（捏人与换装的核心机制）
- **加载**：RealityKit 原生读 `.usdz`；按 USD prim 名 `findEntity(named:)` 拿到身体与各衣服实体（**prim 名是离线资产阶段在 Blender 里命名的，构成命名契约**，见 §5.4）。
- **驱动**：身材通道用 `BlendShapeWeightsComponent` 驱动；通过 `BlendShapeWeightsMapping` **按通道名**（如 `k_weight`）定位、避免硬编 index。
- **单一权重源广播**：一组身材权重**同时写入身体与所有在穿衣服**的对应通道——这是「同形变、不穿模」的根（Spike C 已验证）。
- **值类型纪律**：RealityKit Component 是 struct，改完**必须写回** `entity.components.set(...)`。

### 4.3 渲染与材质（纹理落地）
- 服装材质用 `PhysicallyBasedMaterial`；换纹理 = 把 AI/重渲染出的图包成 `TextureResource` 写进 `baseColor`，回写 `ModelComponent.materials`（Spike E 已验证机制）。
- 本期只用 base color 槽；其余 PBR 槽用预制或留默认。

### 4.4 模块划分
| 模块 | 职责 | 是否联网 |
|---|---|---|
| 捏人引擎 | 通道权重/骨骼缩放 → RealityKit | 否 |
| 换装引擎 | 分开法组合、互斥、兜底 | 否 |
| 纹理管线 | 设计文档 ↔ UV mask ↔ base color、重渲染 | 重渲染否；首次生成是 |
| 资产/存储 | SwiftData + 文件系统、资产索引 | 否 |
| 网络/AI | Provider（理解/分类、纹理生成）→ 薄代理 | 是 |

### 4.5 与 AIKit 共享层的关系边界
- **目标架构**：本 App 的「**衣服理解/分类**」能力**直接复用 `AIKitCore` 的 `AIProvider` 契约**（多模态补全 + 流式，正是 AIKit 的本职最大公约数）。
- **纹理生成**：按 `cross-app-ai-sharing.md` §1/§3 的宪法，**图像生成不进共享层** → 它是**本 App 专属 provider**（类比 StyleTwin 的 `ImageGenProvider`），但**沿用同一套 Provider 模式**并**复用 AIKit 的跨切面件**（同意/披露、重试退避、后端代理实现 `BackendProxyProvider`、`AIUsage` 成本计量）。
- **落地节奏**：AIKit 目前随 StyleTwin 内部实现、尚未抽成独立包；故本 App **当前先自带一层接口形状与 AIKit 一致的本地 Provider 层**，待 AIKit 抽成 Swift Package、本 App 迁出独立仓库后改为 `import AIKit`，零摩擦。MIT、不沾 GPL，迁仓无许可问题。
- 相关待拍板项见 `cross-app-ai-sharing.md` §5（D-A..D-F：流式实现、图片载荷、注入粒度、重试形状、密钥管理、成本计量）。

---

## 5. 资产管线（离线，非运行时）

> 本章是产品最不可省的人力（A-4）。运行时只改权重、永不重导模型。

### 5.1 资产架构：分开法
- **1 个身体 + N 件衣服**，每件衣服一个独立文件，各带与身体**同名**的 morph 通道。
- 总量 = **身体 1 + 衣服件数**（线性增长），**不随身材组合爆炸**（一件衣服 = 1 文件 + 一套通道，连续插值出无穷中间态）。
- 合并法（身体+衣服合一）**仅 spike 用**，产品不用。

### 5.2 身材通道定义（终态 8~10 个）
身体与**每件衣服**都带这套**同名**通道（命名 = `k_` 前缀 + 小驼峰）。通道分两类：**比例类**（ARKit 可 seed）与**围度类**（仅手动）。

| 通道 id | 含义 | 类别 | ARKit 可 seed | 默认 | 范围 | 标定度量（B-2） |
|---|---|---|---|---|---|---|
| `k_height` | 整体身高 | 比例 | ✅ | 0 | 0..1 | 站立身高(m) |
| `k_legLength` | 腿长 | 比例 | ✅ | 0 | 0..1 | 髋→踝(m) |
| `k_armLength` | 臂长 | 比例 | ✅ | 0 | 0..1 | 肩→腕(m) |
| `k_shoulder` | 肩宽 | 比例 | ✅ | 0 | 0..1 | 左右肩峰距(m) |
| `k_weight` | 胖瘦 | 围度 | ❌ | 0 | 0..1 | （手动）|
| `k_muscle` | 肌肉量 | 围度 | ❌ | 0 | 0..1 | （手动）|
| `k_chest` | 胸围 | 围度 | ❌ | 0 | 0..1 | （手动）|
| `k_waist` | 腰围 | 围度 | ❌ | 0 | 0..1 | （手动）|
| `k_hip` | 臀围 | 围度 | ❌ | 0 | 0..1 | （手动）|
| `k_faceWidth` | 脸宽（可选） | 比例 | 🟡 | 0 | 0..1 | 颧骨宽(m) |

- 权重 0..1 为内部值；UI 可映射到直观区间（如身高 1.45–2.00m）。
- **标定度量**列即 FR-2 的 B-2 标定表项，同时供 FR-1 正交测量态实时读数。
- 克制原则：通道越多文件越大、实时计算越重 → 控制在最小必备集。

### 5.3 制作流程 MakeHuman → Blender → USDZ
1. **MakeHuman**：选基础人体 + 贴身 CC0 衣物；T-pose；米制。对**每个通道**导出「中性 + 仅该滑块拉满」两态 OBJ（只动那一个滑块，保顶点序）。
2. **Blender**：对同一 neutral 用 **Join as Shapes / New from Objects** 做差生成各 `k_xxx` shape key；身体与衣服**通道一一同名**；清 UV（0–1 不重叠）、Apply 变换、米制。
3. **导出 USD**：勾 **Shape Keys**（导成 USD blend shape）、勾 **Convert Orientation**（Z-up→Y-up）；得 `body.usdz` + 各 `garment_*.usdz`（均带 blendshape + UV + base color 槽）。USD blendshape 会自带占位 `Skel` 骨架，属正常。
- ⚠ 优先 **Blender 原生 USD 导出**；Reality Converter 对 blendshape/骨架保真更弱。

### 5.4 命名与对齐契约（运行时按名取用，必须稳定）
| 契约项 | 约定 | 用途 |
|---|---|---|
| **身体 prim 名** | `Body` | `findEntity(named:"Body")` |
| **衣服 prim 名** | `Garment_<assetId>`（assetId 全局唯一、小写+下划线） | 运行时定位某件衣服实体 |
| **morph 通道名** | §5.2 的 `k_*`，身体与每件衣服**逐一同名** | 单一权重源广播（不穿模的根，★★★）|
| **UV set** | 单一 UV set `st`，全在 0–1、不重叠 | AI 纹理 / 语义区域对齐 |
| **base color 槽** | 每件衣服一个可替换 `PhysicallyBasedMaterial`，槽名 `mat_basecolor` | 运行时换纹理（FR-3/FR-7）|
| **单位 / 朝向** | 米制；Y-up（导出勾 Convert Orientation） | 与 RealityKit 一致、标尺/量身准确 |
- **通道同名契约**是「单一权重源广播、不穿模」的根（最易翻车处，★★★）。
- 每件资产另带一份 **manifest**（§5.9）声明其通道/UV/区域/槽位/遮挡；运行时与资产索引据此装配。

### 5.5 衣服品类清单（taxonomy）—— 横切契约
- 定义资源库支持的**有限品类集合**，**= 库内可用 conforming Mesh 集合** = **FR-4 分类器的标签空间**（闭集；超出则回退/提示）。
- 以 **AssetIndex（资产索引）** 落库，结构（契约级）：
```json
{
  "categories": [
    {
      "category": "dress",                 // 枚举，= 分类标签
      "slot": "fullbody",                  // 部位/槽位（§5.10）
      "meshRef": "Garment_dress_a",        // → prim 名 / usdz
      "uvTemplateRef": "uv/dress_a.png",
      "segmentationMapRef": "seg/dress_a.png",
      "semanticRegions": ["FrontChest","Back","SkirtFront","SkirtBack"],
      "variants": [{ "attr": "length", "values": ["mini","midi","maxi"] }],
      "bodyHiding": "hide/dress_a.png",    // body-hiding 遮挡掩膜
      "pushOut": 0.004                     // push-out 外扩(m)
    }
  ]
}
```
- 新增品类 = 新增一件 conforming 衣服资产 + 在 AssetIndex 登记，分类标签随之扩展。

### 5.6 许可合规
| 资产 | 许可结论 | 免费 App 是否放宽 |
|---|---|---|
| **MakeHuman**（主线） | 导出网格 **CC0**（须 GUI 正常导出，勿用库链接/server/批量模式） | ✅ 本就无条件，免费身份进一步放大优势 |
| **Daz Genesis**（排除作主资产） | App 内分发须 Interactive License，基础人 + 每 morph 单独授权 | ❌ 与收费无关，免费也要买 |
| **SMPL/SMPL-X**（排除） | 商用禁止，需 Meshcapade 商业授权 | ❌ 公开分发不在其非商用范围 |
| **Reallusion CC4**（仅备选） | 内容免版税；**含捏人滑块/创建系统大概率触发 Enterprise License** | 🟡 仍须**书面确认**，与收费无关 |
- **本 App 免费、不商用，但「免费 ≠ 非商用」**：各家放宽不一致，故坚持 MakeHuman CC0 主线最干净。

### 5.7 资产验收标准（复用 Spike A–E）
- **A** 导出的 usdz 中，身体与衣服都带**同名** morph 通道（Reality Composer Pro 可见）。
- **B** 真机 iOS 18+ 上一个权重能同时驱动身体与衣服形变。
- **C** 拉满身材时贴身衣服仍包在体外、无明显穿模。
- **D** 真机帧率可用。
- **E** 运行时可替换衣服 base color。
- 任一项不过 → 卡点定位（多为通道命名不一致 / 漏勾 Shape Keys / 两态顶点序错位）。

### 5.8 工具与生产解耦
- spike 用 MakeHuman 仅作「一次性测试资产来源」，**不等于锁定为唯一生产工具**；Blender→USD→RealityKit 这半条链与「用什么工具捏人体」无关。
- 正式生产工具的取舍是另一决策，核心约束是**许可**（CC4 捏人大概率触发 Enterprise，MakeHuman CC0 最干净）。

### 5.9 资产清单（manifest）契约
每件衣服/身体资产随 usdz 附一份 manifest（结构化，入 AssetIndex 或并存），声明运行时装配所需信息：
```json
{
  "assetId": "dress_a",
  "kind": "garment",                   // body | garment
  "primName": "Garment_dress_a",
  "category": "dress",
  "slot": "fullbody",
  "channels": ["k_height","k_legLength","k_shoulder","k_weight","k_chest","k_waist","k_hip"],
  "uvSet": "st",
  "materialSlot": "mat_basecolor",
  "semanticRegions": ["FrontChest","Back","SkirtFront","SkirtBack"],
  "bodyHiding": "hide/dress_a.png",
  "pushOut": 0.004,
  "license": "CC0",
  "source": "MakeHuman"
}
```
- `channels` 是该资产**实际带的通道子集**（可少于全集，但凡带的必须与 §5.2 **同名**）。
- `license`/`source` 入档便于合规审计（§5.6）。

### 5.10 部位/槽位模型与互斥替换
- 槽位枚举：`top`（上装）· `bottom`（下装）· `outerwear`（外套）· `fullbody`（连体/连衣裙）· `shoes` · `accessory`。
- **互斥规则**（FR-5 换装）：同一槽位**互斥**（换上装替换原上装）；`fullbody` 与 `top`+`bottom` 互斥（穿连衣裙时清空上/下装）。
- **叠放顺序**：`outerwear > top`；`shoes`/`accessory` 独立——用于渲染遮挡与 body-hiding 叠加。
- 每件衣服在 manifest 声明所属 `slot`；换装引擎据此判定可否同穿。

---

## 6. AI 纹理管线与 Provider 抽象

### 6.1 设计文档（Design Doc）= 真相，PNG = 渲染结果
- 一套纹理的**真相是结构化设计文档**；**PNG 是其确定性渲染产物**：`render(DesignDoc) → baseColor.png`，同一文档恒得同一图（`renderHash` 校验）。
- 结构（契约级）：
```json
{
  "id": "doc_123",
  "version": 3,
  "garmentCategory": "dress",
  "garmentAssetRef": "dress_a",
  "regions": {
    "FrontChest": { "fill": "generated", "genRef": "gen_88", "tint": "#3366CC" },
    "Back":       { "fill": "color",     "color": "#3366CC" },
    "SkirtFront": { "fill": "pattern",   "pattern": "stripe", "params": {"angle":45,"scale":0.1}, "colors":["#ffffff","#3366CC"] }
  },
  "baseProvenance": { "input": "image", "refImageRef": "ref_7", "providerModel": "..." },
  "renderHash": "sha256:…"
}
```
- `fill ∈ {color, pattern, generated}`：`color`/`pattern` 由本地渲染器合成（**不调 AI**）；`generated` 引用一次 AI 产物 `genRef`，可再叠 `tint`。
- 编辑 = 改这份 JSON 的字段（§6.3 决定走重渲染还是重生成）；文档可版本化、回退（FR-7）。

### 6.2 语义区域 → UV mask 契约
- **区域 id 命名**：大驼峰、语义化、每品类固定集合，登记在 manifest/AssetIndex（如上装 `FrontChest`/`Back`/`SleeveL`/`SleeveR`/`Collar`；裙 `SkirtFront`/`SkirtBack`）。
- **掩膜格式**：每品类一张 **indexed segmentation map**（与 UV 模板同分辨率、对齐 0–1 UV），**每区域一个固定调色板索引/颜色**；本地渲染器与 AI 约束都按此图取区域。
- 生成/重渲染均**按区域受约束**：AI 仅在指定区域内作画，本地渲染器按区域填色/铺图案，控制落位、缓解接缝。

### 6.3 生成 vs 重渲染（决策契约）
| 编辑类型 | 路径 | 是否调 AI |
|---|---|---|
| 改区域颜色 / `tint` | 本地重渲染 | 否 |
| 改图案类型/角度/密度/配色 | 本地重渲染 | 否 |
| 区域间复制 / 调换填充 | 本地重渲染 | 否 |
| 改某区域为「**全新生成**图案/材质」 | 重生成（**仅该区域**） | 是 |
| 换整体参考图 / 全新风格 | 重生成 | 是 |
- **本地渲染器管线**：`基底 → 各区域按 fill 合成（color 填充 / pattern 程序化铺贴 / generated 贴 AI 图 + tint）→ 输出目标分辨率 baseColor.png`。确定性、可缓存。
- 默认走重渲染；仅 `fill=generated` 的**内容变更**才触发纹理生成 Provider（§6.4），把 AI 调用与成本关进最小范围（NFR-5）。

### 6.4 Provider 抽象（两类能力并列，契约级接口形状）
**① 衣服理解/分类 Provider** — 复用 `AIKitCore.AIProvider`（app 侧 request builder 拼 `AIRequest` + 对返回文本做 JSON 解码）
- 输入：`{ text?: String, image?: Data, taxonomy: [Category] }`（taxonomy 注入闭集标签）
- 输出（解码自模型文本）：
```json
{ "category": "dress", "confidence": 0.92,
  "attributes": { "length": "midi", "sleeve": "none", "fit": "loose" },
  "appearance": { "dominantColors": ["#3366CC"], "pattern": "solid", "material": "cotton" } }
```
- `category` 必属 `taxonomy`；低 `confidence` 或越界 → 回退/提示（FR-4）。

**② 纹理生成 Provider** — 本 App 专属（不进共享层），沿用同一 Provider 模式 + 复用 AIKit 同意/重试/计量
- 输入：`{ prompt?: String, refImage?: Data, uvTemplate: Ref, segmentationMap: Ref, regions: [RegionId], constraints }`
- 输出：`baseColor.png`（对齐 UV、限定区域）+ `genRef` 入库
- 约束：**只产 base color**（C-7）；候选实现 = img2img + ControlNet(seg/depth) / 各家图像 API / 自托管 SD

- 两者统一经 `BackendProxyProvider` 走后端薄代理（C-6）；接口形状与 AIKit 一致，迁仓后 `import AIKit`。

### 6.5 质量边界
- 强项：颜色、图案、材质观感。
- 弱项/已知限制：UV 接缝错位、UV 空间是展开变形、文字/logo/对称图案难精确对齐 → 通过「语义区域约束 + 款式交预制 + 只 base color」把风险关进可控盒子。

### 6.6 缓存与成本
- **缓存键**：`renderHash = hash(归一化 DesignDoc)`；命中即复用 PNG、不重渲染。AI 产物按 `genRef` 单独缓存，可被多文档引用。
- 重渲染优先（§6.3）+ 区域级生成把 AI 调用降到最小；`AIUsage` 计量归因，薄代理统一限流/计费（NFR-5）。

---

## 7. 数据模型与存储

### 7.1 存储策略
- **结构化数据**（模特状态、设计文档、资产索引、搭配、用户存档）→ **SwiftData**。
- **大文件**（纹理 PNG、`.usdz`、AI 生成图）→ **文件系统**（沙盒 `Documents`/`Caches`）；**数据库只存路径**。
- SwiftData 与系统 Files app 不冲突。

### 7.2 概念实体
| 实体 | 关键字段（摘） |
|---|---|
| BodyModel（模特状态） | id、通道权重集、骨骼缩放、来源(手动/ARKit)、命名、是否默认 |
| GarmentAsset（衣服资产） | id、品类、usdz 路径、UV 模板引用、语义区域定义、子属性变体 |
| TextureDesignDoc（设计文档） | id、garmentCategory、语义区域参数、引用资产、渲染出的 PNG 路径、版本 |
| Outfit（搭配） | id、bodyModel_id、衣服+纹理集合、命名 |
| AssetIndex（资产索引） | 品类→Mesh/UV/区域 的登记表（= taxonomy） |
| UserArchive（用户存档） | 模特/衣橱/纹理/搭配的归属与组织 |
| ConsentRecord（同意） | id、范围、时间、版本（按 NFR-3） |

### 7.3 沙盒文件布局
- `Documents/`：需长期保留的纹理 PNG、导出 usdz、设计文档渲染结果。
- `Caches/`：可重建的 AI 中间图、临时渲染。
- 路径由 SwiftData 记录；删除存档时一并清理对应文件。

### 7.4 资产索引与版本
- AssetIndex 是 taxonomy 的落库形态（§5.5），随衣服资产增减更新。
- 设计文档版本化，支持重渲染回退（FR-7）。

---

## 8. 后端薄代理

### 8.1 职责
- **转发 AI 调用**（理解/分类、纹理生成）；**隐藏密钥**（Key 不进客户端，C-6）；**限流/计费**（NFR-5）。
- **不承载业务逻辑**：捏人、换装、设计文档全在客户端。

### 8.2 接口（IF）
- **IF-1 用户界面**：iOS 原生（SwiftUI）——捏人面板、换装、360° 视图、纹理/设计文档编辑、存档、设置/隐私。
- **IF-2 AI 能力接口（Provider 抽象，经薄代理）**：见 §6.4 两类能力。
- **IF-3 后端 API**：HTTPS/REST；Token 鉴权；请求形状对齐 `AIProvider`（messages/attachments/options，流式吐 delta），使 `BackendProxyProvider` 仅薄薄一层转发。

### 8.3 隐私
- **基本不上传真人照片**：捏人靠参数（ARKit 本机）、换装靠文字/衣服图。隐私负担显著低于 2D 人像点评类产品。
- 含人像的参考图：优先本机抠图后再上传，并披露（NFR-3）。

### 8.4 鉴权与安全
- 传输 TLS；Token 鉴权；后端不持久化用户人像；密钥仅存服务端。

---

## 9. 非功能需求

### NFR-1 性能与体验
- 捏人/换装/旋转交互 ≈ 60fps，拖滑块实时形变无明显卡顿（Spike D 已证可用）。
- 纹理首次生成有显式进度态；重渲染近实时。

### NFR-2 可靠性与降级
- 所有云端调用具超时、重试、退避；单个 AI 步骤失败不致整流程不可用（捏人/换装/旋转离线可用）。
- ARKit 不可用自动回退手动（FR-2）。

### NFR-3 隐私 / 安全 / 合规
- 满足 PIPL/GDPR 等。**人像最小留存**：ARKit 本机处理、仅留参数；默认不长期留存原始参考图；提供一键删除本地数据。
- 发数据前**同意/披露**（复用 AIKit 同意流，文案本 App 注入）；优先选承诺不留存、不用于训练的 Provider。

### NFR-4 最低 iOS 与兼容性
- 最低 **iOS 18**（`BlendShapeWeightsComponent` 门槛，C-1）。
- ARKit 功能按机型能力渐进增强、优雅降级（A-5）。

### NFR-5 成本可控
- 重渲染优先（§6.3）+ 缓存（§6.6）+ 薄代理限流/计费 + `AIUsage` 归因，控制单位成本。

### NFR-6 可维护 / 可扩展
- AI 能力以 Provider 抽象封装，模型/厂商热替换；复用 AIKitCore，迁仓后 `import AIKit`（C-5）。
- 引擎与 UI 分离，便于单测与复用。

### NFR-7 内容安全
- 对用户上传（参考图）与模型生成的图像做内容审核；遵守各 Provider 使用政策。

### NFR-8 包体与资产体积
- 控制随包 usdz/纹理体积；MVP 衣服件数 3~5 件（A-4）；通道集最小必备（§5.2）。

---

## 10. 里程碑与计划

> 对齐可行性文档「MVP 约 3~4 个月（1 iOS + 0.5~1 3D 美术 + 复用现成 AI API）」估算。

| 里程碑 | 内容 | 主要交付 |
|---|---|---|
| **M0 资产管线打通** | 1 身体 + 3~5 件 conforming 衣服，分开法、同名通道、USDZ 落地、A–E 复验 | 可用资产集 + 资产验收报告 |
| **M1 捏人 MVP** | FR-1 手动捏身材（折叠面板、8~10 通道、骨骼缩放）、FR-6 旋转展示 | 可捏可转的模特 |
| **M2 AI 纹理** | FR-3 文字+图片生成、FR-4 品类识别选件、FR-7 设计文档/重渲染、§6 Provider+薄代理 | 描述即生成纹理 |
| **M3 换装 + 增强** | FR-5 换装（互斥/兜底）、FR-2 ARKit 自动量身（Should）、FR-8 存档 | 完整换装闭环 |
| **M4 合规与收尾** | NFR-3/7 强化、FR-9（Could）、内容审核、上架准备 | 可上架基线 |

---

## 11. 风险登记（Risk Register）

| ID | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| **RISK-1** | 衣服随 morph **穿模** | 中 | 高 | 资产阶段统一同名通道 + 运行时单一权重源广播；body-hiding + push-out 兜底（机制 Spike C 已证） |
| **RISK-2** | AI 纹理**对齐 UV 质量** | 中高 | 中 | 只 base color；语义区域/ControlNet 约束；款式交预制，AI 不还原剪裁 |
| **RISK-3** | **CC4 Enterprise 授权陷阱** | 中 | 高 | 优先 MakeHuman CC0 绕开；若用 CC4 落地前书面确认 |
| **RISK-4** | **ARKit 骨架→morph 拟合误差**；围度不可得 | 中 | 中 | 仅 seed 比例通道、围度手动；结果可手改；不支持机型回退（FR-2） |
| **RISK-5** | **多通道叠加污染**（重叠顶点过度形变） | 中 | 中 | Phase 2 单独验；设软上限/联动约束；通道集最小化 |
| **RISK-6** | 闭集分类**无匹配项**体验差 | 中 | 低 | 回退最近品类或明确提示，不静默选错；taxonomy 随资产扩展 |
| **RISK-7** | **3D 美术人力**是隐性大头 | 高 | 中 | 提前锁外包/兼职；MVP 衣服 3~5 件 |
| **RISK-8** | **Provider 依赖/成本** | 中 | 中 | Provider 抽象热替换；重渲染优先 + 缓存 + 限流计费 |
| **RISK-9** | 含人像参考图的**隐私** | 低 | 中 | 优先本机抠衣服区域；明示披露；不长期留存 |
| **RISK-10** | 正交相机 / 透视↔正交过渡的 **iOS 实现不确定性** | 中 | 低 | `OrthographicCameraComponent` 可用性与「遮罩式瞬切」过渡手感，用小 spike 先验（延续 spike 驱动） |

---

## 12. 附录

### 附录 A. 需求追踪矩阵（摘）
| 需求 | 关联约束/假设 | 关联里程碑 | 关联风险 |
|---|---|---|---|
| FR-1 手动捏身材 | C-2/C-3、§5.2 | M1 | RISK-5 |
| FR-2 ARKit 量身 | C-9、A-5 | M3 | RISK-4 |
| FR-3 纹理生成 | C-7、A-3、§6 | M2 | RISK-2 |
| FR-4 品类识别选件 | §5.5 | M2 | RISK-6 |
| FR-5 换装 | C-3、§5.4 | M3 | RISK-1 |
| FR-6 旋转展示 | — | M1 | — |
| FR-7 设计文档/重渲染 | §6.1/6.3 | M2 | RISK-8 |
| FR-8 存档 | §7 | M3 | — |

### 附录 B. 关键 iOS 18 API
- `BlendShapeWeightsComponent` / `BlendShapeWeightsMapping`（运行时驱动 morph，iOS 18+）
- `RealityView`（SwiftUI 容器）、`Entity`/`ModelComponent`/`PhysicallyBasedMaterial`/`TextureResource`
- `ARBodyTrackingConfiguration`（身体骨架/估算身高）、`ARFaceTrackingConfiguration`（人脸网格，可选）
- `SwiftData`（结构化持久化）

### 附录 C. 引用来源
- 见各参考文档（§1.4）内引用：Apple Developer（BlendShapeWeightsComponent、ModelComponent、WWDC24 Compose interactive 3D content）、MakeHuman/SMPL/Daz/Reallusion 许可页、Blender USD 导出手册、ControlNet/StableGen/Stable Projectorz 等。

---

*本文件为 v0.1 草案，待评审。完整版位于仓库 `docs/SRS-3D-tryon.md`。*

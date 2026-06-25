# 可行性分析：3D 捏人 + AI 纹理换装 App

> 说明：本文档评估的是一个**全新、独立**的产品（3D 静态换装），与本仓库主线产品 StyleTwin（2D 纸娃娃）**无业务关系**，仅借用本仓库存放调研结论。本期只做可行性，不写 SRS、不写代码。
> 调研时间：2026-06，结论中的版本号/许可条款均以正文「来源」为准，落地前需复核最新条款。

## 0. 产品边界（评估前提）
- 捏一个「近似自己身材」的 3D 模特 → 文字描述衣服 → AI 只生成**纹理贴图（base color 优先）** → 贴到**预制 conforming 服装组件** → 静态、可旋转展示与换装。
- 不做动画、不做 AR、不做「文本→3D mesh」。
- iOS：SwiftUI + RealityKit + USDZ；捏人 = Blend Shape/Morph + 骨骼缩放。
- 后端薄代理，AI Key 不进客户端；基本不上传真人照片。

---

## 1. 资产 Build-vs-Buy：五维对比与推荐

| 维度 | 自建 MakeHuman / MB-Lab + Blender | 买 Daz Genesis（+Interactive License） | 买 Reallusion CC4（Extended/Enterprise） |
|---|---|---|---|
| **成本** | 软件免费；成本是人力 | 基础人 + 衣服 + 每个 morph 都要单独买 Interactive License（基础人形约 $100，按件叠加） | 软件一次性买断；内容**免版税**，但门槛见下 |
| **商用授权** | ✅ **导出网格 CC0**，最干净 | ⚠️ App 内分发 3D 数据**必须** Interactive License，且**基础人 + 每个 morph/角色都要各自授权** | ⚠️ Extended 可用于商业游戏；但**含 morph 滑块(ccSliders)/做"捏人系统"需 Enterprise License**——本产品正中此条 |
| **落地速度** | 慢：拓扑/UV/绑定要自己理 | 快：生态成熟 | 快：导出管线成熟 |
| **衣服 conforming 现成度** | 一般：MakeHuman 自带衣服有限，多为社区资产 | ✅ **最高**：Genesis 生态 conforming 服装海量 | 高：CC 服装库 + 自动适配 |
| **可维护性** | ✅ 完全可控、无授权账目 | 差：授权按件累积，资产越多账目越乱 | 中：买断后可控，但 Enterprise 合同需对接销售 |

**推荐：以 MakeHuman 自建为主线（CC0、零授权负担、与隐私/合规调性一致），CC4 作为"提速备选"。明确排除 Daz 作主资产**——它的 Interactive License 是「按件、按 morph 累加」的长期账目负担，与「用户自由捏身材」强冲突。

> 关键陷阱：CC4 的「捏人系统 / ccSliders」触发 **Enterprise License**。若选 CC4 路线，**落地前必须书面向 Reallusion 确认**「运行时让用户拖动滑块改身材」是否算 character creation system。
> 来源：[Reallusion Content License Policy](https://www.reallusion.com/license/content.html)、[CC4 in videogames 论坛串](https://forum.reallusion.com/550716/Limitations-in-using-characters-made-with-CC4-in-videogames)

---

## 2. 现成资产盘点 + 许可核对

| 资产 | 来源 | 许可结论 | 能否直接商用 |
|---|---|---|---|
| 男女可捏基础人体 | **MakeHuman** | **导出网格 = CC0**（须用 GUI 正常导出；不得以「库链接/server 模式/批量导出」方式使用，否则不享 CC0 豁免） | ✅ 可，最优 |
| 基础人体 / 参数化身材 | **SMPL / SMPL-X** | **研究/教育/非商用艺术**才免费，**商用明确禁止**；商用需走 **Meshcapade** 单独商业授权 | ❌ 不可直接用；除非另购 Meshcapade 商业授权 |
| Conforming 服装 + 人体 | **Daz Genesis** | App 内分发须 **Interactive License**，基础人 + 每个 morph/角色单独授权 | ⚠️ 可，但授权账目重 |
| 人体 + 服装 + 自动适配 | **Reallusion CC4** | 内容**免版税**；商业游戏需 **Extended**；**含捏人滑块/创建系统需 Enterprise** | ⚠️ 可，但「捏人」大概率落入 Enterprise |
| USDZ 转换路径 | Blender → USD/glTF → Apple `usdz` 工具链 / Reality Composer Pro | 转换本身无许可问题，许可看**源资产** | ✅ |

来源：[MakeHuman License](https://static.makehumancommunity.org/about/license.html)、[SMPL Model License](https://smpl.is.tue.mpg.de/modellicense.html)、[SMPL-X License](https://smpl-x.is.tue.mpg.de/modellicense.html)、[Daz Interactive License](https://www.daz3d.com/interactive-license-info)、[Reallusion Content License](https://www.reallusion.com/license/content.html)

---

## 3. 两个技术风险验证

### 风险①：衣服随身材 morph 不穿模
- **可实现，是成熟管线，但有工程量**。做法：
  1. 服装与人体共享**同一套 blend shape 通道命名**；导出时把人体的形变目标"转写"到服装网格（Blender/Daz/CC 的 transfer shape / conform 工具就是干这个）。
  2. 运行时**同一组权重同时驱动**人体与服装的 `BlendShapeWeightsComponent`（一个 weight 源，广播到两个实体）。
  3. 残余穿模用「身体收缩遮挡(body hiding/alpha)」+ 衣服略微外扩(push-out/offset)兜底。
- **结论**：风险**中**。难点不在运行时，而在**预制资产阶段**把每件衣服的 morph 通道对齐做扎实——这正是需要 3D 美术的地方。

### 风险②：AI 生成 texture 对齐「固定 UV 模板」
- **可实现，但质量是主要不确定项**。可行手段（已有开源工具链）：
  - **img2img + ControlNet**（segmentation / depth），以固定 UV 模板的 segmentation map 约束生成区域；
  - UV inpaint / 投影回烤（Stable Projectorz、StableGen 等工具已验证此路）。
- **质量坑**：UV 接缝处错位、纹理在 UV 空间是「展开变形」的、文字/logo/对称图案难对齐。**优先只生成 base color**（路线已这么定，正确），法线/粗糙度用预制或不做。
- **结论**：风险**中高**。建议把「服装款式/版型」交给**预制组件**承担，AI **只负责颜色/图案/材质观感**，不指望 AI 还原精确剪裁——这样把质量风险关进可控的盒子里。
- 来源：[ControlNet UV texture workflow](https://github.com/Mikubill/sd-webui-controlnet/discussions/204)、[StableGen](https://github.com/sakalond/StableGen)、[Stable Projectorz](https://stableprojectorz.com/)

---

## 4. iOS / RealityKit 能力核查（Apple 官方）

| 能力 | 结论 | 最低 iOS / API |
|---|---|---|
| 加载 USDZ | ✅ RealityKit 原生读 `.usdz` | RealityKit 自 **iOS 13**；`Entity/ModelEntity.load(...)`。ARKit 看 USDZ 自 iOS 12 |
| 运行时替换 PBR 材质/纹理 | ✅ 改 `ModelComponent.materials` 上的 `PhysicallyBasedMaterial`（`baseColor`、`TextureResource(from:CGImage)`） | RealityKit（iOS 13+）；材质是 ModelComponent 上的值，非组件，改完回写即可 |
| **运行时驱动 blendshape/morph 权重** | ✅ 但**这是关键版本门槛**：现代、受支持的公共 API 是 **`BlendShapeWeightsComponent`**（WWDC24 引入） | ⚠️ **iOS 18 / visionOS 2 起**。早期 `HasModel.blendWeights` 存在但能力受限、不推荐作为主路径 |
| 骨骼缩放捏人 | ✅ 通过骨架变换/`Transform`，无特殊版本门槛 | iOS 13+ |

来源：[BlendShapeWeightsComponent](https://developer.apple.com/documentation/realitykit/blendshapeweightscomponent)、[Compose interactive 3D content (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10102/)、[ModelComponent](https://developer.apple.com/documentation/realitykit/modelcomponent)、[Modifying RealityKit rendering](https://developer.apple.com/documentation/realitykit/modifying-realitykit-rendering-using-custom-materials)

> **核心结论**：你的「捏人靠 blendshape 运行时驱动」路线，**干净可用的 API 是 iOS 18 起**。在 2026 年（iOS 26 当道），把**最低系统定 iOS 18 完全合理**，无需为旧系统做降级方案。

---

## 5. 成本与团队

- **一次性（资产/授权）**
  - MakeHuman 主线：软件 $0；成本是**整备人力**（清理拓扑、统一 UV、对齐每件衣服的 morph 通道）。
  - 若走 CC4：软件买断（百~千美元级）+ 视情况 **Enterprise License（需谈，量级显著更高）**。
  - Daz：不推荐作主资产；若局部用，按件 Interactive License（基础人形约 $100 起，逐件叠加）。
- **按次（AI 纹理生成）**：托管图像 API 每张几美分~几角；自建 SD/ControlNet 推理则是 GPU 时长成本。薄代理统一计费/限流。
- **是否需要专职 3D 美术**：**需要**（至少外包/兼职）。风险①②的真正工作量在**预制资产阶段**——conforming 服装的 morph 对齐、UV 模板设计、烘焙。这是本项目最不可省的人力。
- **周期估算（粗略）**
  - 资产 + 管线打通（含 1 套人体 + 3~5 件 conforming 衣服 + USDZ 落地）：**4~8 周**。
  - AI 纹理→UV 质量调通（达到"可展示"）：**3~6 周**，与上面可并行。
  - iOS 端（捏人 UI + 换装 + 旋转展示 + 薄代理）：**6~10 周**。
  - **MVP 合计：约 3~4 个月**，前提是有 1 名 iOS + 0.5~1 名 3D 美术 + 复用现成 AI API。

---

## 5b. 关键概念澄清 + 全流程图（写 SRS 前必须吃透）

### 概念①：免费 App ≠ 自动「非商用」，各家许可影响不同
本 App 在 App Store **完全免费、不商用**，但「免费」对各资产许可的影响**不一致**：

| 资产 | 免费 App 是否更宽松 | 关键 |
|---|---|---|
| **MakeHuman** | ✅ 本就 **CC0**，免费/付费都零顾虑 | 无任何条件 |
| **Reallusion CC4** | 🟡 「非商用应用只需 Standard」，但**向用户暴露捏身材滑块=character creation system，仍可能触发 Enterprise，与收费无关** | 仍需书面确认 |
| **Daz Genesis** | ❌ **不放宽**：Interactive License 触发点是「把 3D 网格分发进交互式 App」，**与是否收费无关**（模型离开你电脑给别人用即需授权） | 免费也要买 |
| **SMPL / SMPL-X** | ❌ 不放宽：免费公开 App 属「面向公众分发的产品」，不在其「非商用科研/教育/艺术」范围 | 仍需 Meshcapade 商业授权 |

> 结论强化：**MakeHuman 是唯一免费/商用都无条件的来源**，免费身份进一步扩大其优势。

### 概念②：MakeHuman 衣服「原生 conforming」，但贴合发生在软件内、不是运行时
- 图里 Shirt / Tight Top / Tight Pants / Boots / Gloves 等**贴身衣物**是为 MakeHuman 基础人体设计、CC0、随身材自动贴合。机制是 `.mhclo` **绑定**（每个衣服顶点挂在人体某三角面上），拖身材滑块时 **MakeHuman 软件内部**自动重算。
- ⚠️ 同一列表里的 helmet / claws / gun / wings / hammer 是**挂骨头的硬质道具**，不随身材形变，**不是**你要的 conforming 衣物。
- ⚠️ iPhone 上没有 MakeHuman。自动贴合**只发生在离线阶段**；运行时要靠导出时**烘焙进 USDZ 的 blendshape**。MakeHuman 帮你省的，正是「生成与人体配套的衣服 blendshape」这一最难步骤。

### 概念③：不是「烘焙很多版本」，而是「一件衣服 = 一组 morph 通道」
- ❌ 错误想象：胖版.usdz + 瘦版.usdz + 高版.usdz……（数量爆炸）
- ✅ 实际：**一件衣服 = 1 个文件**，内含 ≈8~10 个 morph 通道（与人体同名）。
  - 一个 morph 通道只存「往该方向怎么动」一份数据，滑块 0→1 连续插值出无穷中间态；
  - 通道可任意叠加（胖0.7 + 高0.3 + 肩宽0.5 同时生效）；
  - 总量 = **衣服件数(5) × 一套固定通道 = 5 个文件**，随件数线性增长，**不随身材组合爆炸**。
- 克制项：通道越多 → 文件越大、iPhone 实时计算越重 → 通道集控制在最小必备集（见 §4-B 思路）。

### 全流程图：资产 → 导出 → iPhone（标注工具 / 产出 / 失败点）

```
[1] 选基础人体 + 贴身衣物
    工具：MakeHuman（人体 macro/detail targets + CC0 conforming 衣服）
    产出：带身材形变 + 自动贴合衣服的工程
    ⚠失败点：误选道具类(helmet/gun/wings)当衣物；衣物件数贪多
        │  导出 OBJ/FBX/MHX2
        ▼
[2] 整备 + 烘焙 morph
    工具：Blender（统一 UV 到 0–1、清拓扑、把人体形变"转写"为人体&衣服同名 blendshape）
    产出：人体 + 每件衣服各带 ≈8~10 个同名 blendshape 通道
    ⚠失败点★★★：人体与衣服 blendshape 命名不一致 → 运行时无法用同一权重驱动 → 穿模
        │  Blender 原生 USD 导出（shape key→USD blendshape，骨架→USD skeleton）
        ▼
[3] 转 USDZ + 验收
    工具：Blender USD 导出 → .usdc/.usdz；在 Reality Composer Pro 打开核对
    产出：人体.usdz、衣服×5.usdz（均带 blendshape + UV + PBR base color 槽）
    ⚠失败点★★★：blendshape/骨架在转换链中丢失（Reality Converter 保真更弱，优先 Blender USD）
        │
        ▼
[4] iPhone 运行时（RealityKit, iOS 18+）
    捏身材：用户拖滑块 → 同一权重同时写入【人体】与【衣服】的 BlendShapeWeightsComponent
    换装：AI 生成 base color 贴图 → TextureResource → 替换 ModelComponent 上 PhysicallyBasedMaterial
    展示：静态可旋转
    ⚠失败点：blendshape 运行时驱动需 iOS 18 公共 API；UV 不干净则 AI 贴图错位
```

> **第一周必做的验证 spike**：走通 [1]→[4] 的**最小一条线**（1 人体 + 1 件衣服 + 1 个身材滑块），重点确认 **[2]/[3] 的 blendshape 没在转换链里丢、且在 RealityKit 里真能被滑块驱动**。这是整条路线最易翻车处，越早证伪越省。

---

## 6. 一页结论（写 SRS 的输入）

- **GO / NO-GO**：**有条件 GO**。技术路线在 iOS 18 基线上各环节均被官方 API / 成熟管线覆盖，无致命阻断。两个「中高」风险（衣服 morph 对齐、AI 纹理对齐 UV）可通过「款式交给预制、AI 只管颜色/图案」的边界设计关进可控范围。

- **推荐 build-vs-buy 路线**：**MakeHuman 自建为主（导出网格 CC0，零授权负担、与隐私调性一致）**；CC4 仅作提速备选且**必须先书面确认捏人是否触发 Enterprise**；**排除 Daz 作主资产**（按件授权账目不可持续）；**排除 SMPL/SMPL-X**（商用禁止，除非另购 Meshcapade）。

- **最小资产清单**：① 男 1 + 女 1 可 morph 基础人体（MakeHuman 导出，CC0）；② 3~5 件 conforming 服装组件（共享 morph 通道 + 固定 UV 模板）；③ 每件衣服一张「UV 模板 / segmentation map」供 AI 约束；④ USDZ 导出管线（Blender→USD→usdz）。

- **关键风险与缓解**
  1. **morph 穿模** → 资产阶段统一 blend shape 通道 + 运行时单一权重源广播；body-hiding + push-out 兜底。
  2. **AI 纹理对齐 UV 质量** → 只生成 base color；ControlNet(seg/depth)+img2img 约束；款式由预制承担，AI 不还原剪裁。
  3. **CC4 Enterprise 授权陷阱** → 若用 CC4，落地前书面确认；优先用 MakeHuman 绕开。
  4. **3D 美术人力是隐性大头** → 提前锁定外包/兼职，MVP 衣服件数控制在 3~5 件。

- **建议最低 iOS 版本**：**iOS 18**（运行时 blendshape 的受支持公共 API `BlendShapeWeightsComponent` 自 iOS 18 起；2026 年定此基线无副作用）。

---
*完整版位于仓库 `docs/feasibility-3D-tryon.md`。*

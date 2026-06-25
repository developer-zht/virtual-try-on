# 第一周技术证伪 Spike：blendshape 全链路打通清单

> 目的：在写 SRS **之前**，用最小代价证实本项目最大不确定性——
> **「一个身材 morph 能否完整穿过 MakeHuman → Blender → USDZ → RealityKit，并用同一个滑块同时驱动人体与衣服、不穿模」**。
> 范围：**1 个人体 + 1 件贴身衣服 + 1 个身材通道 + 1 个滑块**。不追求好看，只追求「链路通 / 不通」的结论。
> 关联：可行性结论见 `docs/feasibility-3D-tryon.md`（§5b 全流程图）。

## 验收标准（Spike 的 go / no-go）
- [ ] **A**. 导出的 `.usdz` 里，人体**和**衣服两个网格都带有同名 blendshape 通道（在 Reality Composer Pro 中可见）。
- [ ] **B**. 在 **真机 iOS 18+** 上，一个 SwiftUI `Slider` 能实时驱动该通道，**人体与衣服一起形变**。
- [ ] **C**. 滑块拉到 1 时，紧身衣服仍包在身体外侧，**无明显穿模**。
- [ ] **D**. 真机帧率可接受（静态可旋转场景流畅）。
- [ ] **E**（附加，便宜）. 能在运行时把衣服材质的 base color 换成另一张图/纯色——验证 AI 纹理那条腿的 RealityKit 侧。
- 任一项 ✗：记录卡在哪一步（多半是 Day2 顶点序不一致 / Day2 命名不一致 / Day3 导出勾选 / Day4 API）。

---

## Day 0 — 环境（Mac + iOS 18 真机是硬性前提）
- [ ] 装 **MakeHuman**（社区版 1.2.x）+ 资源下载器（Asset downloader）。
- [ ] 装 **Blender 4.2+**（其原生 USD 导出器才支持 shape key → USD blendshape）。
- [ ] **Mac + Xcode 16+**（含 iOS 18 SDK 与 **Reality Composer Pro**，用于查 USDZ）。
- [ ] **一台 iOS 18+ 真机**（`BlendShapeWeightsComponent` 的运行时驱动需 iOS 18；模拟器不可靠，务必真机）。

## Day 1 — MakeHuman：产出「中性」与「极端」两态
> 关键认知：MakeHuman 的身材滑块**不会**直接导出成 blendshape，它把形变烤进静态网格。所以我们**导出两个状态**，到 Blender 里做差得到 blendshape。
- [ ] 选基础人体，定性别，摆 **A-pose / T-pose**。
- [ ] 装 **1 件紧身衣物**（推荐 `SR Tight Top 01` 一类——紧身最能暴露穿模）。**别选** helmet/gun/wings 这类硬质道具。
- [ ] **状态①（中性）**：所有身材滑块归零 → 导出（含已穿衣服）为 `neutral.obj`。
- [ ] **状态②（极端）**：只把**一个**滑块拉满（如 Weight=max，其余不动）→ 导出为 `fat.obj`。
- [ ] ⚠ 两次导出**必须完全相同的设置**：同分辨率/不改细分、同缩放/单位、同 feet-on-ground。用 **OBJ** 保顶点序（FBX 可能重排顶点，导致下一步做不出 shape key）。

## Day 2 — Blender：做差生成 blendshape + 命名对齐 + 清理
- [ ] 导入 `neutral.obj`（作基准）与 `fat.obj`。
- [ ] 选中「基准人体」→ 再加选「fat 人体」→ **Object ▸ Join as Shapes**：在基准人体上生成一个名为 `k_weight` 的 shape key。
- [ ] 对**衣服**重复同样操作（MakeHuman 在 fat 态已自动贴合衣服，所以 `fat.obj` 里的衣服就是配套形状）→ 在基准衣服上生成 shape key，**命名也叫 `k_weight`**。
- [ ] ⚠★★★ **两个网格的 shape key 必须同名 `k_weight`**——这是运行时用一个权重同时驱动两者、不穿模的根。
- [ ] 自检：拖动各自 shape key 值 0→1，人体与衣服都应同向变胖。
- [ ] 清理：确认**单一 UV、0–1 空间不重叠**；Apply 所有 Transform；缩放到**米制**；朝向统一。

## Day 3 — 导出 USDZ + 在 Reality Composer Pro 验收
- [ ] **File ▸ Export ▸ USD (.usdc/.usdz)**，在右侧选项面板**勾选「Shape Keys（导出为 USD Blend Shapes）」**；导出人体 + 衣服。
- [ ] 用 **Reality Composer Pro** 打开导出的文件，确认**两个网格都列出了 `k_weight` blendshape 通道**。
- [ ] ⚠★★★ 若通道丢失：先查 Day3 是否漏勾选；再查 Day2 顶点序/shape key 是否真的存在。**Reality Converter 对 blendshape/骨架保真更弱，优先 Blender USD 路径**。
- [ ] → 命中验收标准 **A**。

## Day 4 — Xcode / RealityKit：真机上用一个滑块驱动两者
- [ ] 最小 App：加载 USDZ，拿到人体与衣服的 `ModelEntity`。
- [ ] 关键 API 点（iOS 18+）：
  - 读组件：`entity.components[BlendShapeWeightsComponent.self]`
  - 写权重：`component.weightSet[meshIndex].weights = [value]`，改完**回写**组件到 entity。
  - 命名访问：通过 `BlendShapeWeightsMapping` 按通道名 `k_weight` 定位，避免硬编 index。
- [ ] 用一个 SwiftUI `Slider`（0...1）→ 把**同一个值**写进【人体】和【衣服】的 `k_weight` 权重。
- [ ] **真机运行**：拖滑块，人体与衣服应一起变胖。→ 命中验收 **B**。
- [ ] 拉满检查穿模 → 验收 **C**；看帧率 → 验收 **D**。

## Day 5 — 收尾 + 附加纹理测试 + 写结论
- [ ] 附加（便宜）：运行时把衣服材质换 base color——
      取 `ModelComponent` 上 `PhysicallyBasedMaterial`，改 `baseColor`（或用 `TextureResource(from: CGImage)` 换图），回写 `model.materials`。→ 验收 **E**。
- [ ] 写一页 **Spike 结论**：A–E 各项 ✅/✗，✗ 的卡点与原因，是否影响 SRS 的技术假设（尤其「iOS 18 最低版本」「blendshape 转换链可靠性」）。

---

## 时间与依赖
- 预算：**约 5 个工作日**（1 人即可，需懂基础 Blender 操作）。
- 硬依赖：**Mac + Xcode 16+ + 一台 iOS 18+ 真机**；缺真机则 B/C/D 无法验。
- 最易翻车处（按概率）：① Day2 两网格 shape key 命名不一致；② Day3 漏勾 Shape Keys 导出；③ Day1 两次导出设置不一致致顶点序错位做不出 shape key。

## 来源
- [BlendShapeWeightsComponent](https://developer.apple.com/documentation/realitykit/blendshapeweightscomponent) ·
  [BlendShapeWeightsMapping](https://developer.apple.com/documentation/realitykit/blendshapeweightsmapping) ·
  [Compose interactive 3D content (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10102/)
- [Blender USD 导出手册](https://docs.blender.org/manual/en/latest/files/import_export/usd.html) ·
  [Blender shape key/armature USD 导出 PR](https://projects.blender.org/blender/blender/pulls/111931)
- [USDZ + Blend Shapes 工作流（Apple 论坛）](https://developer.apple.com/forums/thread/766484)

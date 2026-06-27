# 3D 捏人 + AI 纹理换装 App — 文档索引

> ⚠️ **归属提醒**：本系列文档评估的是一个**全新、独立**产品（3D 静态换装），与本仓库主线产品 **StyleTwin（2D 纸娃娃）无业务关系**。
> 目前暂存于本仓库 `docs/` 仅为方便协作；正式立项后建议**迁出到独立仓库**（见下「仓库策略」）。

## 阅读顺序
1. **[可行性结论](./feasibility-3D-tryon.md)** — go/no-go、build-vs-buy 推荐、最小资产清单、风险、最低 iOS 版本。
   - 其中 **§5b** 含三条关键概念澄清（免费 App 许可 / 原生 conforming / morph 通道）+ **资产→导出→iPhone 全流程图**。
2. **[第一周证伪 Spike 清单](./spike-week1-blendshape-pipeline.md)** — 写 SRS 前必做的最小验证：1 人体+1 衣服+1 通道+1 滑块，逐日步骤 + 验收标准 A–E。
3. **[RealityKit 最小 Spike App 教学](./realitykit-spike-app-guide.md)** — 面向 WebGL/three.js 老手：建 Xcode 工程（含多 Target / VSCode+SweetPad）、完整可编译代码、白方块急救、概念映射、Metal 入口。
4. **[资产管线 MakeHuman→Blender→usdz](./asset-pipeline-makehuman-to-usdz.md)** — 从下资源到导出 `scene.usdz` 的逐步操作，含两态做差生成 blendshape、导出选项、存活验证、常见坑。
5. （待产出）SRS — 以上验证通过后再写。

## 一句话结论
**有条件 GO**：iOS 18 基线下各环节被官方 API / 成熟管线覆盖；主线推荐 **MakeHuman 自建（CC0、零授权）**；最大不确定性是 blendshape 能否完整穿过转换链——由第一周 Spike 证伪。

## 仓库策略（建议）
- 两个**相互独立**的产品宜用**两个仓库**，而非同仓两分支（分支用于同一代码库的并行开发，不适合承载无关产品）。
- 建议：2D 留在本仓库；**3D 另建独立仓库**，把本 `docs/` 下三份文档迁过去。
- 在此之前，本索引为 3D 文档的临时入口。

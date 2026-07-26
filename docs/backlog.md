# 3D 试衣 App — 待办与已定决策清单（跨对话的持久记忆）

> ⚠️ 对话是临时的、仓库是永久的。任何要跨对话记住的事都写在这里。
> 新对话请**先读这份**(SRS 开场白已把它列入必读),避免遗漏。
> 状态:☐ 待办 / ✅ 已完成 / 🔒 已决定(写进 SRS)
>
> 📌 **成果汇聚约定**：所有**确定的权威文档**(SRS / 架构说明 / 决策)最终统一收于分支 **`claude/docs-hub`** 的 `docs/`,作为**单一权威来源**;其它 `claude/*` 工作分支产出经确认后汇入此处。当前 hub 权威文档:
> - `docs/SRS-3D-tryon-web.md`(第一阶段·Web,覆盖两版本) / `docs/ARCH-CHANGE-monorepo-3d.md`(架构变更)
> - `docs/SRS-3D-tryon-native.md`(第二阶段·原生) / `docs/code-kickoff-ios.md`、`docs/code-kickoff-aikit.md`(原产于分支 `claude/3d-tryon-srs-svsasl`)
> - 引用同分支文档用相对路径;引用其它分支必须写明分支名。代码相邻文档(如 `try-on-2d` 的 2D AI 内核)不搬入 hub。

## A. 写 SRS 时要纳入/拍板的决策

- 🔒 **【已拍板 2026-07】技术路线 = Web 先行,再移植原生**
  - **第一阶段:TS + WebGL2** 做出可用的完整产品(完整 UI + 全面功能)。
  - **第二阶段:移植 Swift + RealityKit**——届时产品形态与 UX 已定型,方向明确,才是学 Apple 技术栈的好时机(不必一边摸索产品一边摸索新框架)。
  - **影响**:资产导出格式 **USDZ → glTF/GLB**(Blender glTF 导出器同样支持 shape key → morph target,导出时勾 **Shape Keys**);MakeHuman→Blender 管线**无需改动**。
  - **影响**:iOS 18 的最低版本约束在 Web 阶段**不适用**(WebGL2 自 iOS 15;iOS 26 起另有 WebGPU);移植原生阶段再恢复 iOS 18。
  - **注意**:Web 阶段若上架 App Store,需**原生壳 + WKWebView + 真原生功能**以规避 4.2「最低功能」被拒风险。

- ✅ ~~【已解决】渲染技术栈二选一~~(见上,已决定 Web 先行)。保留技术结论备查:两条路均可行;Spike 验证项在 Web 端可对等实现(morphTargetInfluences / 同权重驱动身体+衣服 / 换 texture);**Spike 成果不作废**(验证的是几何事实,与渲染器无关);渲染器只能选一个(WebGL 与 RealityKit 不能混合),但选 Web **不等于**放弃 iOS 原生能力(原生壳+bridge 仍可用 SwiftData/StoreKit 等)。Web 优势:与 2D 共栈、**Canvas 2D 做 Texture Composer 极顺手**、跨平台、迭代快。
  - **背景**:2D 产品(StyleTwin)是 TS+WebGL2;作者有自研 WebGL 引擎(GAMES202/FFT海洋/PRT/SSR/Cook-Torrance),Web 图形是其主场。
  - **技术结论**:两条路**都可行**。Spike 验证项在 Web 端均可对等实现(morphTargetInfluences 驱动身材、同权重驱动身体+衣服、换 texture);**资产管线 100% 可复用,仅导出格式 USDZ→glTF/GLB**(morph target 是 glTF 标准特性)。Spike 成果不因换栈而作废(它验证的是几何事实)。
  - **二选一的边界**:渲染器只能选一个(WebGL 与 RealityKit 是两套独立渲染栈,不能混合)。但选 Web **不等于**放弃 iOS 原生能力——标准做法是**原生壳 + WKWebView + JS↔Swift bridge**,SwiftData/StoreKit/相册/分享/推送照常可用。
  - **选 Web 的优势**:与 2D 共栈;**Texture Composer 用 Canvas 2D 做图层/文字/mask 合成极顺手**(大优势);**解除 iOS 18 限制**(该限制仅来自 BlendShapeWeightsComponent;WebGL2 自 iOS 15,iOS 26 起另有 WebGPU);跨平台(Web/Android);迭代快(热重载,不需 Mac/签名)。
  - **选 Web 的代价**:WKWebView 性能开销(但本产品是静态可旋转单角色,负载极轻,够用)、内存上限需留意大纹理、**App Store 4.2「最低功能」风险(纯套壳可能被拒 → 需真原生壳+原生功能规避)**、UI 原生质感略逊。
  - **真正的张力**:作者曾明确表示**"目的是学习 RealityKit 和 Metal"**。→ 若首要目的是**做产品**,推荐 **TS+WebGL2**;若首要目的是**学 Apple 技术栈**,留在 **RealityKit**。
  - **待作者拍板后再写 SRS**(此决策影响 SRS 每一章:架构/资产格式/存储/最低系统/里程碑)。

- 🔒 **最低 iOS 版本 = iOS 18**(blendshape 运行时 API 门槛)。⚠️ 仅在选 RealityKit 时成立;若改 Web 栈则此约束解除(可放宽至 iOS 15+)。
- 🔒 **展示姿势 = A-pose**(手臂下张约 30~45°,介于 T-pose 与手臂垂体侧之间;自然又利于 skinning/morph 不穿模)。资产规范要写死。
- 🔒 **资产架构 = 分开法**:1 身体 + N 衣服(各贴合同一身体、带同名 morph 通道),运行时组合、可换装。合并法仅用于 spike。
- 🔒 **身材通道(终态约 8~10)**:k_weight/muscle/height/shoulder/hip/chest/waist/legLength/armLength。
- 🔒 **存储**:结构化数据(设计文档/资产索引/用户存档)用 **SwiftData**;大文件(纹理PNG/usdz/AI图)用**文件系统**(沙盒 Documents/Caches),库里只存路径。二者不冲突。
- ☐ **视觉风格 / 脸的质量档位**:MVP 定"能看即可"(MakeHuman 身体 + 哑光材质 + 打光,可无脸/极简脸 + 光头或造型发,走"零售模特"风);"写实好看的脸"列为 v2(需嫁接头,加工作量)。SRS 里明确这条产品风格约束。
- 🔒 **AI 只生成 texture,不生成 mesh**;"文本→可用 3D 衣服"排除本期外。

## B. 正式开发阶段的任务(spike 不含,SRS 后做)
- ☐ **产品 UI:可折叠底部面板**(身材滑块面板,用 VStack 布局分割让模型缩小、不被遮挡;非 .sheet 覆盖)。
- ☐ **产品 UI:模型下方 360° 旋转弧形滑块**(-180~180,绑 `root.orientation` 绕 Y 轴;弧形是自定义 Canvas/Path 控件,先用普通 Slider 也行)。
- ☐ **分开法资产管线正式化**:separate by material 把身体/衣服干净拆开,各带同名 morph;1 身体 + N 衣服。
- ☐ **多身材通道(Phase 2)**:把 §A 那 8~10 个通道逐一烤出;注意多通道叠加可能过度形变(weight+waist+hip 同拉爆躯干),需单独验。

## C. 待评估 / 调研
- ☐ **RealityKit 观感实验**:给 MakeHuman 身体套哑光皮肤材质 + 柔光,看"零售模特感"能到什么程度,再决定值不值得为"好脸"投入嫁接头。
- ☐ **"好脸"路线 B 评估(推荐的脸方案)**:**MakeHuman 身体(承重墙:参数化 morph + conforming 衣服 + 固定 UV)+ MetaHuman 的头(好看的脸)**。脸恰好**不需要随身材 morph 变化**,故可作为静态头嫁接。许可上现已允许。成本 = 一次性手工(导头 + 对缝 + 肤色匹配),每个性别一次。评估该工作量。

### 为什么 MetaHuman/UE 素材不做"身体+衣服"(2026-07 查证,与许可无关)
> ⚠️ 更正:早期说法"MetaHuman 许可锁死在 Unreal 生态"**是错的**——2025-06 起可合法用于其它引擎/DCC,年收入 <100 万美元免费。**该反对理由已作废。** 现行理由如下:
1. **导出会丢 blendshape**:截至 UE5.7,常规 FBX 导出 MetaHuman 只得到**静态网格,无 rig 无 blendshape**;保住形变需特定插件/迂回流程。而 blendshape 是本产品命根子。
2. **它的美来自 UE 独有渲染**:皮肤着色器、strand 发丝(groom)、精细 LOD。导成 glTF 进 WebGL **这些全丢**,只剩一个很重但不再好看的网格。**转 WebGL 后此条更致命。**
3. **衣服不是随身材 morph 的 conforming 系统**,而是蒙皮到骨架(跟骨骼动),没有"变胖时布料撑大"的现成机制。
4. **身材变化不是运行时 morph 通道**,是每角色生成时烤死;要靠"两态做差"自造,且需先验证身材变体间拓扑一致。
5. **需装 UE + 学整套 UE 导出管线**,与 TS/WebGL 路线正交,引入无关工具链。
> 结论:MetaHuman 提供的是**高质量个体角色**,本产品需要的是**参数化系统**(与 Meshy 同一类结构性错配,只是更精致)。→ 身体/衣服走 MakeHuman;MetaHuman 仅作**头的捐赠者**候选。
- ☐ **MPFB2 自动化评估**:批量烤 morph 是否可用 MakeHuman 的 Blender 插件/脚本半自动化(量大时)。
- ☐ **生产工具终选(逐条核实许可)**:MakeHuman(CC0)vs CC4(Enterprise 陷阱)vs **MetaHuman(2025-06 起解锁,UE EULA:<100万美元免费,不能训练AI模型,资产偏重需减面)**。MVP 用 MakeHuman,后续按需复核。

## D. 已核实的关键事实(供 SRS 引用,别重新质疑)
- Spike A–E 全部真机验证通过(见 `spike-week1-blendshape-pipeline.md`)。
- 许可:MakeHuman 导出 **CC0 无条件**;Daz 需按件 Interactive License;SMPL 商用禁止;CC4 捏人滑块触发 Enterprise;**MetaHuman 2025-06 起可用于其它引擎(UE EULA,<100万美元免费)**。
- 本 App 免费、不商用,但**"免费"不等于各家许可里的"非商用"**(Daz/SMPL 不因免费而放宽;MakeHuman 无所谓)。
- **AI 生成网格(Meshy 等)不适合做身体/衣服**:无身材 morph、拓扑每次不同(无法让衣服库贴合同一身体)、衣服焊死不可换、UV 不可控。买单个精品角色同理=孤岛。需要的是"成套系统"而非"单个模型"。

## 怎么在新对话里唤醒这些
1. 打开 `docs/SRS-kickoff.md`,复制其中代码块到新对话 —— 它已让新对话先读本 backlog + 其它文档。
2. 或直接对新对话说:"先读 `docs/backlog.md` 和 `docs/3D-tryon-index.md`,继续未完成的待办。"

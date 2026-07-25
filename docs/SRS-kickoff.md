# SRS 开场白（项目前提快照 / 新对话粘贴即可开始写 SRS）

> 双重用途：
> ① 想在**新对话**里写 SRS：复制下面代码块整段粘过去即可（推荐，干净上下文质量更高）。
> ② 不开新对话也有价值：它是**本项目所有前提的快照**，隔一段时间回来能快速进入状态。
> 建议产出文件名：`docs/SRS-3D-tryon.md`（与 StyleTwin 的 `docs/SRS.md` 区分）。
>
> ⚠️ 前提变更时务必同步更新本文件。最近一次更新：2026-07（技术路线改为 **Web 先行**）。

```
我要为一个【全新独立的 3D 虚拟试衣产品】写 SRS(软件需求规格说明书)。
它和本仓库主线产品 StyleTwin(2D 纸娃娃)无业务关系,只是暂存于同仓库。

== 开始前请先读这些已产出的文档(在分支 claude/festive-wozniak-6pcz8e 上)==
- docs/backlog.md                 —— 待办与已定决策清单(务必先读,含全部🔒决策与待评估项)
- docs/3D-tryon-index.md          —— 总索引 + 进度
- docs/feasibility-3D-tryon.md    —— 可行性结论(GO)、build-vs-buy、许可核对、风险
- docs/spike-week1-blendshape-pipeline.md —— Spike 真机验证结果(A–E 全过)
- docs/asset-pipeline-makehuman-to-usdz.md —— 资产管线 + 多通道路线图 + 工具解耦
- docs/spike-1b-clothes-walkthrough.md —— 身体+衣服验证流程
- docs/realitykit-spike-app-guide.md —— RealityKit 相关(第二阶段移植时才用)
请先读完,SRS 要与它们一致,不要推翻已验证的结论。

== 产品一句话 ==
用户捏一个近似自己身材的 3D 模特 → 文字描述衣服 → AI 只生成纹理(优先 base color)
贴到预制 conforming 服装组件上 → 静态、可旋转地展示与换装。不做动画、不做 AR。

== 技术路线(已拍板:Web 先行,再移植原生)==
- 【第一阶段·本期 SRS 主体】**TypeScript + WebGL2**,做出可用的完整产品(完整 UI + 全面功能)。
  作者有自研 WebGL 引擎(GAMES202 / FFT海洋 / PRT / SSR / Cook-Torrance),Web 图形是其主场;
  且与 2D 产品(StyleTwin)同栈,Texture Composer 用 Canvas 2D 合成极顺手。
- 【第二阶段·SRS 需预留接口/不必展开】移植 **Swift + RealityKit**(届时产品形态已定型)。
- 资产格式:**glTF / GLB**(morph target 为 glTF 标准特性;Blender 导出时勾 Shape Keys)。
  第二阶段移植时再转 USDZ。MakeHuman→Blender 管线两阶段通用、无需改动。
- 最低系统:Web 阶段**不受 iOS 18 限制**(WebGL2 自 iOS 15;iOS 26 起另有 WebGPU);
  第二阶段移植 RealityKit 时才恢复 iOS 18(BlendShapeWeightsComponent 门槛)。
- 若 Web 版要上 App Store:必须**原生壳 + WKWebView + 真原生功能**,以规避 4.2「最低功能」被拒。
  原生壳仍可用 SwiftData / StoreKit / 相册 / 分享 / 推送(经 JS↔Swift bridge)。

== 其它已锁定的关键决策(SRS 必须遵循)==
1. 捏人 = Blend Shape/Morph(运行时权重驱动)+ 骨骼缩放;**AI 只生成 texture,不生成 mesh**;
   "文本→可用 3D 衣服"排除本期外。
2. 资产主线 = **MakeHuman**(导出 CC0,无条件);排除 Daz(按件 Interactive License)、
   SMPL(商用禁止);CC4 的"捏人滑块"可能触发 Enterprise License。
   本产品免费不商用,但**"免费"≠各家许可里的"非商用"**。
   **MetaHuman 已于 2025-06 解锁(可用于其它引擎,<100万美元免费),但不作身体/衣服**
   (导出丢 blendshape、其美依赖 UE 专有渲染、衣服是骨架蒙皮非 morph conforming),
   **仅作"头的捐赠者"候选**(见 backlog)。
3. 资产架构 = **分开法**:1 身体 + N 衣服(各贴合同一身体、带同名 morph 通道),
   运行时组合、可换装。合并法仅用于 spike。
4. 身材通道(终态约 8~10):k_weight/muscle/height/shoulder/hip/chest/waist/legLength/armLength。
5. **展示姿势 = A-pose**(手臂下张约 30~45°;自然且利于 skinning/morph 不穿模)。
6. **视觉风格**:MVP 定"能看即可"——身体 + 哑光材质 + 好打光,走"零售模特"风
   (可无脸/极简脸 + 光头或造型发);"写实好看的脸"列为 v2(嫁接头方案)。
7. AI 纹理:语义区域(FrontChest 等)→ UV mask;**设计文档 JSON 是真相,PNG 只是其渲染结果**;
   大多数编辑=重渲染而非重调 AI。AI 能力以 Provider 抽象,避免厂商锁定。
8. 后端 = 薄代理,AI Key 不进客户端;隐私负担低,基本不上传真人照片。
9. 存储:结构化数据(设计文档/资产索引/用户存档)—— Web 阶段用 IndexedDB,
   原生阶段用 SwiftData;大文件(纹理PNG/glTF/AI图)走文件/对象存储,库里只存路径。

== Spike 已真机验证(不要再质疑这些已成立的技术点)==
A usdz 含 blendshape ✅;B 真机滑块驱动身体 ✅;C 身体+衣服一起变形不穿模 ✅;
D 帧率可用 ✅;E 运行时换衣服 base color ✅。可行性 GO 已坐实。
注:验证在 RealityKit 上完成,但结论是**几何事实**,换 WebGL 同样成立;
morphTargetInfluences / 换 texture 在 three.js/WebGL 中均为原生能力。

== 协作约定 ==
- 文档双写:产出文档时写入仓库 docs/ 并在对话中给出(过长则摘录核心+注明路径)。
- 开发分支:claude/festive-wozniak-6pcz8e(所有提交推这里)。
- 可参考本仓库已有的 StyleTwin docs/SRS.md 的结构作为版式。

== 我要你做的 ==
先给我一份 SRS 大纲(章节结构)征求我意见,确认后再逐节填写。SRS 应覆盖:
产品范围与边界、用户故事/功能需求(捏身材/文字描述生成纹理/换装/旋转展示)、
技术架构(Web 阶段为主,并为第二阶段原生移植预留边界)、资产管线、
AI 纹理管线与 Provider 抽象、数据模型与存储、后端薄代理、
非功能需求(隐私合规/性能/可维护性/上架合规)、里程碑与风险登记。
最终产出写入 docs/SRS-3D-tryon.md。
```

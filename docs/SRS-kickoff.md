# SRS 开场白（在新对话里粘贴这段即可开始写 SRS）

> 用途：写 SRS 是大活，建议开新对话（干净上下文）。把下面代码块整段复制到新对话即可，
> 它带齐了产品、已定决策、Spike 结论、仓库文档位置与协作约定。
> 建议产出文件名：`docs/SRS-3D-tryon.md`（与 StyleTwin 的 `docs/SRS.md` 区分）。

```
我要为一个【全新独立的 iOS 3D 虚拟试衣 App】写 SRS(软件需求规格说明书)。
这个产品和本仓库的主线产品 StyleTwin(2D 纸娃娃)无业务关系,只是暂存于同仓库。

== 开始前请先读这些已产出的文档(在分支 claude/festive-wozniak-6pcz8e 上)==
- docs/3D-tryon-index.md          —— 总索引 + 进度
- docs/feasibility-3D-tryon.md    —— 可行性结论(GO)、build-vs-buy、许可核对、风险、最低iOS
- docs/spike-week1-blendshape-pipeline.md —— Spike 真机验证结果(A–E 全过)
- docs/asset-pipeline-makehuman-to-usdz.md —— 资产管线 + 多通道路线图 + 工具解耦
- docs/realitykit-spike-app-guide.md —— RealityKit/工程相关
- docs/spike-1b-clothes-walkthrough.md —— 身体+衣服验证流程
请先把这些读完,SRS 要与它们一致,不要推翻已验证的结论。

== 产品一句话 ==
用户捏一个近似自己身材的 3D 模特 → 文字描述衣服 → AI 只生成纹理(优先 base color)
贴到预制 conforming 服装组件上 → 静态、可旋转地展示与换装。不做动画、不做 AR。

== 已锁定的关键决策(SRS 必须遵循)==
1. iOS:SwiftUI + RealityKit + USDZ;最低 iOS 18(blendshape 运行时 API 门槛)。
2. 捏人 = Blend Shape/Morph(运行时权重驱动)+ 骨骼缩放;AI 只生成 texture,不生成 mesh。
3. 资产主线 = MakeHuman(导出 CC0,无条件商用/免费);排除 Daz(按件授权)、SMPL(商用禁止);
   CC4 仅备选且"捏人滑块"可能触发 Enterprise License。本 App 免费、不商用,但"免费≠非商用"。
4. 资产架构 = 分开法:1 身体 + N 衣服(各贴合同一身体、带同名 morph 通道),运行时组合、可换装;
   合并法只用于 spike,产品不用。
5. 身材通道(终态约 8~10 个):k_weight/muscle/height/shoulder/hip/chest/waist/legLength/armLength。
6. AI 纹理:语义区域(FrontChest 等)→ UV mask;设计文档 JSON 是真相,PNG 是其渲染结果;
   大多数编辑=重渲染而非重调 AI(详见之前讨论的 Veslune 架构)。
7. 后端 = 薄代理,AI Key 不进客户端;隐私负担低,基本不上传真人照片。
8. 存储:结构化数据(设计文档/资产索引/用户存档)用 SwiftData;大文件(纹理PNG/usdz/AI图)用
   文件系统(沙盒 Documents/Caches),数据库只存路径。SwiftData 与 Files app 不冲突。

== Spike 已真机验证(不要再质疑这些已成立的技术点)==
A usdz 含 blendshape ✅;B 真机滑块驱动身体 ✅;C 身体+衣服一起变形不穿模 ✅;
D 帧率可用 ✅;E 运行时换衣服 base color ✅。可行性 GO 已坐实。

== 协作约定 ==
- 文档双写:产出文档时写入仓库 docs/ 并在对话中给出(过长则摘录核心+注明路径)。
- 开发分支:claude/festive-wozniak-6pcz8e(所有提交推这里)。
- 可参考本仓库已有的 StyleTwin docs/SRS.md 的结构作为版式。

== 我要你做的 ==
先给我一份 SRS 大纲(章节结构)征求我意见,确认后再逐节填写。SRS 应覆盖:
产品范围与边界、用户故事/功能需求(捏身材/文字描述生成纹理/换装/旋转展示)、
技术架构、资产管线、AI 纹理管线与 Provider 抽象、数据模型与存储、后端薄代理、
非功能需求(隐私合规/性能/最低iOS18/可维护性)、里程碑与风险登记。
最终产出写入 docs/SRS-3D-tryon.md。
```

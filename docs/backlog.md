# 3D 试衣 App — 待办与已定决策清单（跨对话的持久记忆）

> ⚠️ 对话是临时的、仓库是永久的。任何要跨对话记住的事都写在这里。
> 新对话请**先读这份**(SRS 开场白已把它列入必读),避免遗漏。
> 状态:☐ 待办 / ✅ 已完成 / 🔒 已决定(写进 SRS)

## A. 写 SRS 时要纳入/拍板的决策
- 🔒 **最低 iOS 版本 = iOS 18**(blendshape 运行时 API 门槛)。
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
- ☐ **"好脸"路线 B 评估**:MakeHuman 身体 + 嫁接一个好看的静态头(MetaHuman 现已可合法用于其它引擎,是候选头源)。评估对缝/肤色匹配工作量。
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

# 资产管线：MakeHuman → Blender → `scene.usdz`（Spike 版）

> 目标：产出一个 `scene.usdz`，内含 **Body + Shirt 两个网格，各带一个同名 blendshape `k_weight`**，喂给 `BlendShapeSpike` Target 验证。
> 原则：这是 spike，**只做最小一条线**——1 人体 + 1 衣服 + 1 身材通道。不做 UV/贴图（那是后续 AI 纹理的事）。
> 平台：MakeHuman 与 Blender 都有 Windows 版，本管线可全程在 Windows 完成；只有最后「在 Reality Composer Pro 验证」需要 Mac（也给了跨平台替代验证法）。

## 为什么要导"两态做差"
MakeHuman 的身材滑块**不会**导出成 blendshape——它把形变直接烤进静态网格。所以我们导**两个状态**（中性 + 单滑块拉满），到 Blender 里用 **Join as Shapes** 求差，得到一个 blendshape 通道。
⚠ 关键前提：**Join as Shapes 要求两个网格顶点数与顺序完全一致**。MakeHuman 在只动身材滑块时顶点序不变，所以两次导出**除了那一个滑块，其它一律不能动**。

---

## Step 0 — 装软件（都免费）
- **MakeHuman**：makehumancommunity.org 下载社区版（1.2.x）。
- **Blender 4.2+**：blender.org（其原生 USD 导出器才支持 shape key → USD blendshape）。

## Step 1 — MakeHuman：导出「中性」与「极端」两个 OBJ
1. 打开 MakeHuman，默认已有一个基础人体。
2. **拿衣服**：顶部 `Geometries ▸ Clothes` 看可用衣服。若列表太少，去 `Community ▸ Download assets`（资源下载器）下一件**贴身上衣**（紧身最能暴露穿模），下完回到 Clothes 勾选穿上。
3. **定姿势**：`Pose/Animate ▸ Pose` 选 `Tpose`（固定姿势，避免两次导出姿态不一致）。
4. **设导出比例**：到导出面板时把 **Scale units 设为 meter**（RealityKit 用米制）。
5. **导出中性态**：`Files ▸ Export ▸ Wavefront (.obj)`，文件名 `neutral.obj`。记住此刻所有选项。
6. **改成极端态**：`Modelling ▸ Main`，**只把一个滑块拉满**（例：`Weight` 拖到最右），其余**一律不动**。
7. **再导出**：同样 `.obj`、**完全相同的导出选项/比例/姿势**，文件名 `fat.obj`。
8. ⚠ 两次导出之间**绝对不要**：改细分/拓扑、换衣服、改姿势、改比例。只有那一个滑块不同。

> MakeHuman 还会一并导出 eyes/teeth/eyebrows 等小件——spike 阶段不管它们，下一步在 Blender 里删掉，只留身体和上衣。

## Step 2 — Blender：做差生成 blendshape + 命名对齐
1. 新建 Blender 文件，删掉默认立方体。
2. **导入 neutral.obj**：`File ▸ Import ▸ Wavefront (.obj)`。导入选项确保**按对象/组拆分**（不要合并成一个对象），这样身体和上衣是两个独立对象。
3. 把身体对象**重命名为 `Body`**、上衣对象**重命名为 `Shirt`**（删掉 eyes/teeth 等其它件）。
   - ★ 这两个名字会变成 USD 里的 prim 名，**必须和 Swift 代码 `findEntity(named: "Body")/"Shirt"` 完全一致**。
4. **导入 fat.obj**，同样得到身体+上衣，重命名为 `Body_fat`、`Shirt_fat`（其它件删掉）。
5. **给 Body 加 blendshape**：
   - 先点选 `Body_fat`，再 **Shift 点选 `Body`**（让 Body 成为「活动对象」=最后选中）。
   - 到 `Object Data Properties（绿三角图标）▸ Shape Keys` 面板，点右侧下拉箭头 `∨ ▸ Join as Shapes`。
   - Body 上会多出一个名为 `Body_fat` 的 shape key。把它**改名为 `k_weight`**。
   - 自检：选 Body，拖这个 shape key 的 Value 0→1，身体应变胖。
6. **给 Shirt 加 blendshape**：先点 `Shirt_fat`，再 Shift 点 `Shirt`（活动），`Join as Shapes`，把新 shape key 也**改名为 `k_weight`**。
   - ★★★ Body 和 Shirt 的 shape key **必须同名 `k_weight`**——这是运行时一个权重同时驱动两者、不穿模的根。
7. 删掉 `Body_fat`、`Shirt_fat`（用完即弃）。
8. **自检**：分别选 Body 和 Shirt，各自拖 `k_weight` 0→1，两者都应同向变胖。
9. **规整变换**：选中 Body+Shirt，`Object ▸ Apply ▸ All Transforms`；确认整体约 1.7~1.8m 高。
   - spike 不需要 UV/贴图，跳过。

## Step 3 — 导出 `scene.usdz`
1. 选中 `Body` + `Shirt`。
2. `File ▸ Export ▸ Universal Scene Description (.usd/.usdc/.usda/.usdz)`，文件名后缀写 **`.usdz`**。
3. 右侧导出选项（不同 Blender 版本措辞略有差异，按语义找）：
   - **General ▸ Selection Only**：勾上（只导选中的 Body/Shirt）。
   - **Object Types ▸ Meshes**：开。
   - **Rigging ▸ Shape Keys**：✅ **必须勾**（把 shape key 导成 USD blend shape）。
     - 若你的版本把它叫 “Shape Keys / Blend Shapes”，认准这个词。
   - **Armatures**：本 spike 从 OBJ 来、无骨架，可不勾。
   - 上轴(Up axis)：保持 USD 默认 **Y-up**（RealityKit 也要 Y-up）。
4. 命名 `scene.usdz`，导出。

## Step 4 — 验证 blendshape 是否真的存活（导出后必做）
任选其一（推荐至少做 B）：
- **A（Mac，最权威）**：用 **Reality Composer Pro** 打开 `scene.usdz`，分别选 Body / Shirt，确认各自列出名为 `k_weight` 的 blend shape 通道。
- **B（跨平台，Windows 也能做）**：把刚导出的 `.usdz/.usdc` **重新导入**一个新的 Blender 场景，确认 Body / Shirt 仍带 `k_weight` shape key。丢了 → 说明 Step3 没勾 Shape Keys。
- **C**：装了 `usdview`（USD 工具）的话直接查 prim 上的 blendshape。

✅ 两个网格都带 `k_weight` → 资产合格。把 `scene.usdz` 拖进 Xcode 的 `BlendShapeSpike` Target（勾 Copy + 勾该 Target）→ ⌘R，自动走真实模型分支。

---

## 常见坑速查
| 现象 | 原因 | 解 |
|---|---|---|
| Join as Shapes 报 “vertex count mismatch” | 两次导出拓扑不一致（改了细分/换衣服/换姿势） | 重导，保证**只动一个滑块**，其它全不动 |
| 导入后 body 和 shirt 黏成一个对象 | OBJ 导入没按对象/组拆分 | 导入选项开拆分；或 `P ▸ By Loose Parts`/按材质分离 |
| 导出后 RealityKit 里没 blendshape | Step3 没勾 **Shape Keys** | 重导并勾上；用 Step4-B 复验 |
| 模型在 App 里巨大/极小/躺倒 | 比例非米制 / 上轴不对 | Apply 变换 + 米制 + Y-up |
| `findEntity(named:)` 返回 nil | Blender 里对象名不是 `Body`/`Shirt` | 改名一致，或改 Swift 里的名字 |
| 免费 Apple ID 真机 7 天后打不开 | 免费证书有效期短 | 重新 Build 一次即可（spike 阶段可接受） |

## 来源
- [Blender USD 导入/导出手册](https://docs.blender.org/manual/en/latest/files/import_export/usd.html)（含 Shape Keys 导出选项）
- [Join as Shapes 需顶点数一致（Blender 社区）](https://blenderartists.org/t/shape-key-join-as-shapes-vertex-count-mismatch/1254582)
- [MakeHuman 资源下载与 CC0 衣服](https://static.makehumancommunity.org/assets.html)

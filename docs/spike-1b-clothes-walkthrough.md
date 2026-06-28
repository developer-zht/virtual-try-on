# Phase 1b 完整操作单：身体 + 衣服 验证不穿模（合并法）

> 自包含,不用翻聊天记录。目标:做一个"身体+衣服"合并模型,一个 `k_weight` 同时驱动两者,
> 在 iPhone 上拖滑块看**身体变胖时衣服穿不穿模**。
> 合并法只用于本 spike(做 1 个、验证、丢弃);产品阶段用"分开法"(1 身体 + N 衣服),与此不同。

---

## Part A — MakeHuman(产出两态 OBJ)
1. 中性人 + `几何形状 ▸ 服装` 穿**一件贴身上衣/套装**(如 casualsuit01),无帽无鞋。
2. `姿态/动画 ▸ Pose` 选 Tpose。
3. `文件 ▸ 导出`:网格格式 **Wavefront obj**、比例单位 **米(meter)**、文件名 `neutral2` → 导出。
   - "UV贴图"**不用勾**(那是导贴图图片,与网格 UV 无关)。
4. `建模 ▸ 主要`:**只把"体重"拖到最右(150%)**,其它别动、衣服别脱。
5. `文件 ▸ 导出`:相同设置,文件名 `fat2` → 导出。
   - 铁律:两态之间**只有体重不同**。

## Part B — Blender(做差 + 导出 USDZ)

### B1 清空场景
- Outliner 里把已导入的网格对象全选 → `X` 删掉(Camera 留着无所谓)。

### B2 导入 neutral2(合并成一个对象)
- `文件 ▸ 导入 ▸ Wavefront (.obj)` → 选 `neutral2.obj`。
- 右侧选项:**「Split by Object」「Split by Group」都不勾**;Forward Axis `-Z`、Up Axis `Y`(默认)。
- 点 Import。→ 得到一个对象(含身体+衣服+眼睛三个材质,正常)。

### B3 改名
- Outliner 里双击该对象,改名 **`Body`**。

### B4 导入 fat2(完全相同设置)
- `文件 ▸ 导入 ▸ Wavefront (.obj)` → `fat2.obj`,**同样两个 Split 都不勾**。
- 改名 **`Body_fat`**。

### B5 做 k_weight(做差)
- 先点 `Body_fat`,再 **Shift 点 `Body`**(让 Body 成为活动对象;标题栏显示 `Body`)。
- 右侧 Properties → **Object Data Properties(绿色倒三角图标)** → 展开 **Shape Keys**。
- 点列表右边下拉箭头 **`∨` → `New from Objects`**(Blender 5.x 里这就是旧版"Join as Shapes")。
- 现在 `Body` 的 Shape Keys 出现 `Basis` + 一个新键。

### B6 测试穿模(关键里程碑)
- 选 `Body`,点那个新形态键,拖下方 **Value 0→1**。
- **身体和衣服应一起变胖**。盯着腰腹/胸交界:
  - 衣服包在身体外 = ✅ 不穿模。
  - 身体从衣服钻出来 = ⚠ 穿模(这正是我们要发现的)。
- 看完把 **Value 拖回 0**。

### B7 改名 + 清理
- 双击该形态键,改名 **`k_weight`**。
- Outliner 里选 `Body_fat` → `X` 删掉。现在只剩 `Body`(带 `Basis` + `k_weight`)+ Camera。

### B8 导出 scene2.usdz
- 选中 `Body`。
- `文件 ▸ 导出 ▸ Universal Scene Description`,文件名 `scene2.usdz`。
- 右侧选项:
  - **General ▸ Selection Only** ✅
  - **General ▸ Convert Orientation** ✅(展开后保持 Forward -Z / Up Y)
  - **Rigging ▸ Shape Keys** ✅(必须!否则没 blendshape)
  - 其余默认。
- 点 Export USD。

### B9 自检
- `文件 ▸ 新建 ▸ General` → `文件 ▸ 导入 ▸ Universal Scene Description` → 选 `scene2.usdz`。
- 选 `Body`,看 Shape Keys 里有没有 `k_weight`。**在 = 成功。**

## Part C — Mac / Xcode(上真机)

### C1 传文件
- 把 `scene2.usdz` 传到 Mac(AirDrop/网盘/U盘)。

### C2 换进工程
- Xcode 左侧:右键旧的 `scene.usdz` → Delete → Move to Trash(移除旧的)。
- 把 `scene2.usdz` 拖进 `BlendShapeSpike` 组:勾 **Copy items if needed** + 勾 **BlendShapeSpike** target。
- 改代码一行:`forResource: "scene"` → `forResource: "scene2"`。
  - (或省事:把文件名直接改成 `scene.usdz` 再拖进去,代码就不用改。)

### C3 运行
- 选 iOS 26.5 真机 → ⌘R。
- 拖底部滑块:**身体 + 衣服一起变胖**;盯腰腹看**衣服穿不穿模**。
- 控制台应打印「找到 1 个带 blendshape 的实体」(合并法是 1 个;分开法才是 2 个)。

---

## 验收
- ✅ 身体+衣服一起变形 → C 段穿模这关(C 验收项)通过。
- 不穿模 = conforming 质量 OK,DIY 路线成立。
- 若穿模 = 记录在哪穿(腰/腋下/裆),作为后续"body-hiding / push-out"缓解的依据。

## 常见坑
- 纹理不显示:正常,与 spike 无关,忽略。
- `New from Objects` 灰的:两个对象没同时选中,或活动对象不是 Body(标题栏要显示 Body)。
- 导出后无 blendshape:B8 没勾 Shape Keys。
- 模型躺倒/过大:B8 没勾 Convert Orientation / 单位不对。

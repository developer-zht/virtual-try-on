# ios-3d-tryon —— 3D 试衣分身 App 的第一段代码

> 这是 SRS（`docs/SRS-3D-tryon.md`，在分支 `claude/3d-tryon-srs-svsasl`）落地的**独立** iOS 工程，
> 与本仓库 2D 主线 StyleTwin 无业务关系（正式立项后建议迁出独立仓库）。
> 本次交付两件事：**① 正交相机 spike（RISK-10）** 和 **② 工程脚手架**。

---

## 0. 一句话：这里有什么

```
ios-3d-tryon/
├── Packages/FitTwinCore/   ← 纯逻辑核心：零 SwiftUI/RealityKit/SwiftData，可单测、跨平台
│                              （§5.2 通道、§5.4 命名、§5.10 互斥、§6.1 设计文档、B-2 标定数学）
├── FitTwin3D/              ← ② 脚手架 App：RealityView 加载 usdz + 捏人滑块 + §7.2 SwiftData
├── OrthoSpike/             ← ① 相机 spike：透视⇄正交「锁视角」+ 遮罩式过渡 + 矢量标尺（用完即弃）
├── project.yml             ← XcodeGen 工程描述（一条命令生成 .xcodeproj）
└── README.md              ← 你正在看的这份
```

**为什么分三块**：SRS 反复强调「引擎只算、UI 只画、引擎可单测」（§4.1 / NFR-6）。
所以把**与设备无关的纯逻辑**关进 `FitTwinCore`（能在任何机器上 `swift test`），
把**必须真机/Xcode 才能编译的 RealityKit/SwiftData/SwiftUI 胶水**留在 App target。
spike 单独成 target，和正式工程隔离，验证完可整个删掉。

---

## 1. 硬依赖（绕不过去）

- **Mac + Xcode 16+**（含 iOS 18 SDK + Reality Composer Pro）。
- **一台 iOS 18+ 真机**。`BlendShapeWeightsComponent` 与 `OrthographicCameraComponent`
  在模拟器上不可靠，**验收必须上真机**。
- spike 占位资产 **`scene.usdz`**（身体 `Body` + 衣服 `Shirt`，各带 `k_weight` 通道）——
  来自资产管线文档，放进 App 资源即可（见 §4）。脚手架没有它也能跑（②的 SwiftData 自检不依赖资产；
  ①的 spike 没 usdz 会自动用「白方块」兜底）。

> 我（写这段代码时）在一台 Linux 机器上，**没有 Mac、不能编译 iOS**。所以：
> 纯逻辑核心我写了单测保正确；RealityKit/SwiftData 部分按 iOS 18 文档写好，
> 其中**两个较新的 API 触点**我无法在此编译验证，已收口并打了「真机核对」标记（见 §6）。

---

## 2. 文件 ↔ SRS 契约对照（边读边对）

| 文件 | 对应 SRS | 说明 |
|---|---|---|
| `FitTwinCore/BodyChannels.swift` | §5.2 | 8~10 个身材通道 + 比例/围度分类 + B-2 标定（占位米值） |
| `FitTwinCore/BodyMeasurements.swift` | §5.2 / FR-1 / FR-2 | 权重↔真实尺寸双向换算（纯函数，有单测） |
| `FitTwinCore/SculptEngine.swift` | §4.4 | 捏人引擎**协议**（纯，不碰 RealityKit） |
| `FitTwinCore/NamingContract.swift` | §5.4 | `Body`/`Garment_*`/`mat_basecolor`/`st` 命名常量 |
| `FitTwinCore/WardrobeSlots.swift` | §5.10 / FR-5 | 槽位枚举 + 互斥替换规则（有单测） |
| `FitTwinCore/DesignDoc.swift` | §6.1 | 设计文档纯值类型（被 §7.2 实体内嵌复用） |
| `FitTwin3D/Sculpt/RealityKitSculptEngine.swift` | §4.2 ★ | **单一权重源广播**：一组权重同时驱动身体+在穿衣服 |
| `FitTwin3D/Sculpt/BlendShapeBinding.swift` | §4.2 | 把 BlendShape API 收口一处，按通道名定位、不硬编 index |
| `FitTwin3D/Persistence/SwiftDataEntities.swift` | §7.2 | `BodyModel`/`GarmentAsset`/`TextureDesignDoc`/`Outfit`/… 实体骨架 |
| `OrthoSpike/ProjectionController.swift` | FR-1 / FR-6 / RISK-10 | 透视⇄正交切换 + 遮罩式瞬切 |
| `OrthoSpike/RulerOverlay.swift` | FR-1 | 矢量标尺，随缩放重算刻度、放大保持锐利 |

---

## 3. 打开工程：两条路，选一条

### 路 A（推荐）：XcodeGen 一条命令生成
```bash
brew install xcodegen          # 只需一次
cd ios-3d-tryon
xcodegen generate              # 读 project.yml → 生成 FitTwin3D.xcodeproj
open FitTwin3D.xcodeproj
```
工程里有两个 scheme：**FitTwin3D**（②脚手架）和 **OrthoSpike**（①spike），左上角切换运行。

> 为什么用 XcodeGen：`.xcodeproj` 是一坨机器生成的文本，手维护极易冲突。
> 用 `project.yml` 这份**人能读的描述**当真相，工程随时重建——也方便你 review 我建了什么。
> 生成出的 `.xcodeproj` 已在 `.gitignore` 里（不入库）。

### 路 B：手动在 Xcode 里建（不想装工具）
1. Xcode → File ▸ New ▸ Project ▸ **iOS App**；Interface **SwiftUI**，**不要**勾 AR；
   Minimum Deployments 设 **iOS 18.0**。命名 `FitTwin3D`。
2. 把 `FitTwin3D/` 下的 5 个文件夹（App/Persistence/Sculpt/Scene/Views）拖进工程
   （勾 *Copy if needed* + 加入 FitTwin3D target）。
3. File ▸ Add Package Dependencies ▸ **Add Local…** ▸ 选 `Packages/FitTwinCore` ▸
   加到 FitTwin3D target。
4. 再 File ▸ New ▸ Target ▸ iOS App 建 **OrthoSpike**（同样 iOS 18 / SwiftUI / 非 AR），
   把 `OrthoSpike/` 4 个文件加进去。
5. 删掉 Xcode 自动生成的 `ContentView.swift` / `XXXApp.swift` 模板，用本仓库的同名文件。

---

## 4. 放占位资产 `scene.usdz`

把 spike 的 `scene.usdz` 复制到 **`FitTwin3D/Resources/scene.usdz`**
（XcodeGen 路会自动作为资源打包；手动路记得勾 FitTwin3D 的 *Copy Bundle Resources*）。
命名契约必须对上（§5.4）：身体 `Body`、占位衣服 `Shirt`、通道 `k_weight`。
详见 `FitTwin3D/Resources/PUT_scene.usdz_HERE.md`。
（想用真实模型测 spike 的标尺，也可放一份到 `OrthoSpike/Resources/scene.usdz`；不放就用白方块。）

---

## 5. 跑起来看什么（= 验收）

### ① OrthoSpike（先做，消 RISK-10）
- 右上角 **🔓/🔒「锁视角」** 按钮：点一下 → 短暂淡化过渡 → 进入**正面正交**测量态（旋转锁定、出标尺）；
  再点 → 回**透视**展示态（可单指拖动旋转）。
- **要看的手感**：切换那一下**顺滑、不突兀**（投影类型其实是「瞬切」，被遮罩淡化+轻微缩放藏住了）。
- 正交态点 **放大/缩小**：标尺刻度**随之变细**、读数更密、线条**依旧锐利**（矢量绘制）。
- 底部 **正面/背面/左侧/右侧**：命名视图循环（俯视本期留位不做）。
- **验收（kickoff ①）**：锁/解锁顺滑无突兀；正交态刻度线性正确、缩放后更细且清晰。

### ② FitTwin3D（脚手架）
- **「捏人」Tab**：拖底部折叠面板的滑块（占位资产带 `k_weight`，拖「围度 ▸ 胖瘦」最直观）——
  真机上身体（及衣服）**一起形变、不穿模**（复现 Spike B/C）。顶部会提示身体与衣服的共享通道。
- **「存档」Tab**：点「新建一个 BodyModel」——计数 +1；退出 App 重进仍在 → 证明 §7.2 SwiftData 建/存/取通了。
- **验收（kickoff ②）**：拖滑块身体+衣服一起变；SwiftData 能建/存/取 `BodyModel`。

---

## 6. ⚠️ 真机核对清单（我无法在无 Mac 处编译的地方）

这几处**结构是对的**，只是个别 iOS 18 新 API 的**符号名**请在 Xcode 自动补全里确认一下；
若有出入，只改被收口的那一两行，其余逻辑不动：

1. **`OrthographicCameraComponent` 可用性**（RISK-10 的**核心问题**）——
   `OrthoSpike/ProjectionController.swift`。真机若渲染不出无透视的正交视图：
   按 kickoff ① 的退路，退到「透视相机拉远 + 窄 FOV」近似，评估标尺误差，回写 RISK-10。
2. **`BlendShapeWeights` 的逐权重名访问**——`FitTwin3D/Sculpt/BlendShapeBinding.swift`
   的 `weightNames(_:)` 一行（我按文档写成 `.weightNames`；若 SDK 上叫别的，改这行）。
3. **组件构造**：`BlendShapeWeightsMapping(meshResource:)` → `BlendShapeWeightsComponent(weightsMapping:)`，
   同文件 `ensureComponent(on:)`。

文档链接都写在对应文件的注释里。

---

## 7. 跑单测（纯核心，不需要真机）
```bash
cd ios-3d-tryon/Packages/FitTwinCore
swift test
```
覆盖：换装互斥规则（§5.10）、B-2 标定正反算 + 围度不被反解污染（B-5）+ 越界 clamp（B-6）。
（Xcode 里也能跑 FitTwinCore 的测试 target。）

---

## 8. 名字是占位的，可改

`FitTwin3D` / `FitTwinCore` / bundle id `com.styletwin.*` 都是**占位**（SRS 暂定名）。
改名：动 `project.yml` 的 `name` 与 `PRODUCT_BUNDLE_IDENTIFIER`、`Package.swift` 的 `name`，重生成即可。

## 9. 本期没做（边界）
AI 那条腿（衣服理解 / 纹理生成 / 薄代理）按 SRS 留到 **M2**；ARKit 自动量身留到 **M3**；
骨骼缩放、body-hiding/push-out 先留占位。本次只交 ①spike + ②脚手架骨架。

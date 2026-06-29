# RealityKit 最小 Spike App —— 给 WebGL/three.js 老手的速成

> 读者画像：自写 WebGL 引擎（GAMES202、FFT 海洋、PRT、SSR、Cook-Torrance）。
> 所以本文**不解释图形学基础**，只讲「RealityKit 与你已知世界的差异」+ 最小可跑代码 + Metal 入口。
> 目标：Spike Day4——加载 USDZ，一个 Slider 同时驱动人体与衣服的 blendshape。

## 1. 分层心智模型（先对齐坐标系）

| 你的世界 | Apple 世界 | 说明 |
|---|---|---|
| WebGL / WebGPU（底层 GPU、写 GLSL/WGSL） | **Metal**（写 MSL） | 同层。Spike **不碰**。 |
| `<canvas>` + GL context | `MTKView` / `CAMetalLayer` | 同层。Spike 不碰。 |
| **three.js**（场景图 + 高层渲染器） | **RealityKit** | 同层，但 RealityKit 是 **ECS**，不是 OO 场景图。这是最大差异。 |
| `Object3D`（节点，挂 children/material/geometry） | **`Entity`** | Entity 只是「ID + 一袋 Component」，自身几乎没行为。 |
| `mesh.geometry` / `mesh.material` | **`ModelComponent`**（`MeshResource` + `[Material]`） | 几何与材质是**挂在 Entity 上的一个 Component**。 |
| `BufferGeometry` | `MeshResource` | |
| `MeshStandardMaterial` | `PhysicallyBasedMaterial` | 都是 metal/rough Cook-Torrance。 |
| `ShaderMaterial` / `RawShaderMaterial` | **`CustomMaterial`**（写 MSL surface/geometry modifier） | ← **你想学 Metal 的入口①**。 |
| `Texture` | `TextureResource` | |
| `Scene` 根 | `RealityViewContent` / 根 `Entity` | |
| `PerspectiveCamera` | `PerspectiveCamera`（也是个 Entity） | 非 AR 场景**必须自己加**，否则黑屏。 |
| IBL / 平行光 | `ImageBasedLightComponent` / `DirectionalLight` | 概念一致。 |
| `requestAnimationFrame` + `onBeforeRender` | **`System`**（ECS 系统，每帧 update） 或 `RealityView` 的 `update` 闭包 | |
| 把内容挂到页面 | **`RealityView`**（SwiftUI 容器，iOS 18+） | 现代挂载点。 |

> 一句话：**RealityKit ≈ three.js 的定位，但用 ECS 重写，跑在 Metal 上**。SceneKit 是更老的 OO 版（类似早期 three.js 风格），**别用**。

## 2. 会咬你一口的四个 ECS 差异（WebGL 直觉失效处）

1. **Component 是值类型（struct）**。`three.js` 里 `mesh.material.color = ...` 直接生效；RealityKit 里你拿到的是**拷贝**，改完**必须写回** `entity.components.set(comp)`，否则无效。
2. **Entity 几乎没行为，行为在 Component/System**。别找 `entity.setBlendShape(...)` 这种方法——你是去拿 `BlendShapeWeightsComponent` 改它的数据。
3. **名字来自 USD prim**。`root.findEntity(named: "Body")` 里的 "Body" 就是你在 **Blender 里给网格起的名字**。→ 所以 Blender 阶段要给人体、衣服**起可识别的名字**。
4. **资源是引用计数的 `Resource`**（`MeshResource`/`TextureResource`/`MaterialParameters`），异步 `try await` 加载，和 three.js 的 loader 回调心智类似，但用 Swift `async`。

## 3. 最小可跑代码（iOS 18+，SwiftUI + RealityView）

> 把你 Blender 导出的 `scene.usdz`（含 Body + Shirt 两网格、各带同名 blendshape `k_weight`）拖进 Xcode 工程的 bundle。

```swift
import SwiftUI
import RealityKit

struct ContentView: View {
    @State private var weight: Float = 0          // 唯一的身材滑块 0...1
    @State private var bodyEntity: Entity?
    @State private var garmentEntity: Entity?

    var body: some View {
        VStack {
            RealityView { content in
                // —— 构建阶段（≈ three.js 初始化场景）——
                guard let url = Bundle.main.url(forResource: "scene", withExtension: "usdz"),
                      let root = try? await Entity(contentsOf: url) else { return }
                content.add(root)

                // 按 Blender 里的命名抓到两个网格实体
                bodyEntity    = root.findEntity(named: "Body")
                garmentEntity = root.findEntity(named: "Shirt")

                // 非 AR：必须自己加相机 + 光，否则黑屏
                let cam = PerspectiveCamera()
                cam.look(at: .zero, from: [0, 1.2, 2.5], relativeTo: nil)
                content.add(cam)

                let light = DirectionalLight()
                light.light.intensity = 2000
                light.look(at: .zero, from: [1, 2, 1.5], relativeTo: nil)
                content.add(light)
                // 想要 PBR 好看：用 ImageBasedLightComponent 挂一张 HDR 环境贴图（你熟 IBL）

            } update: { content in
                // —— 每当 @State 变化（拖滑块）重跑：把同一权重写进两个实体 ——
                setBlendWeight(bodyEntity,    to: weight)
                setBlendWeight(garmentEntity, to: weight)
            }

            Slider(value: $weight, in: 0...1)
                .padding()
        }
    }

    /// 把单通道 blendshape 权重写进一个实体（注意值类型 → 必须写回）
    func setBlendWeight(_ entity: Entity?, to value: Float) {
        guard let entity,
              var comp = entity.components[BlendShapeWeightsComponent.self]
        else { return }

        // weightSet：该实体上每个「含 blendshape 的网格」一组权重
        // 单通道场景：直接把这一通道设为 value
        for i in comp.weightSet.indices {
            comp.weightSet[i].weights = [value]
        }
        entity.components.set(comp)        // ★ 值类型，必须写回才生效
    }
}
```

### 健壮版：按通道名定位（多通道时用，别硬编 index）
真实有 8~10 个通道时，用 `BlendShapeWeightsMapping`（名字→索引）按 `"k_weight"` 定位对应位置再写，避免依赖通道顺序。Spike 单通道用上面的 `[value]` 即可。

## 4. 你想学 Metal —— 这个项目的三个真实入口

RealityKit 默认把你和 Metal 隔开。要真正写 Metal，挑这些口子（都和你 WebGL 经验直接对应）：

1. **`CustomMaterial` + MSL surface/geometry modifier**（≈ 你的 `ShaderMaterial`）。
   - surface modifier：改 PBR 输出（albedo/normal/rough…），可做你的 Kulla-Conty、SSS 风格效果。
   - geometry modifier：顶点阶段位移——**可用来在 GPU 上做 blendshape/波动**，对写过 FFT 海洋的你是顺手的。
2. **`LowLevelMesh` / `LowLevelTexture`（iOS 18）**：直接写顶点/纹理缓冲，可由 **compute shader** 填充。→ 把你的 Stockham IFFT 那套搬过来驱动顶点，是绝佳练手。
3. **AI 纹理落地**：把生成的图写进 `MTLTexture`，经 `LowLevelTexture` / `DrawableQueue` 包成 `TextureResource` 喂给材质——这正是本 App「AI texture → 上身」那条腿的底层接法。

> 但**Spike 阶段一律别碰**：先用 `PhysicallyBasedMaterial` + 内建 blendshape 把链路跑通，确认 go/no-go。Metal 是通过之后的「深水区」。

## 5. Spike Day4 验收对照
- Slider 拖动 → Body 与 Shirt 一起变形（验收 B）。
- 拉满不穿模（验收 C）、帧率 OK（验收 D）。
- 附加 E：拿 `garmentEntity` 的 `ModelComponent`，把首个 `PhysicallyBasedMaterial` 的 `baseColor` 换成纯色/`TextureResource`，写回 `model.materials` —— 验证 AI 纹理腿的 RealityKit 侧。

## 来源
- [BlendShapeWeightsComponent](https://developer.apple.com/documentation/realitykit/blendshapeweightscomponent) ·
  [BlendShapeWeightsMapping](https://developer.apple.com/documentation/realitykit/blendshapeweightsmapping) ·
  [RealityView](https://developer.apple.com/documentation/realitykit/realityview) ·
  [CustomMaterial](https://developer.apple.com/documentation/realitykit/custommaterial) ·
  [LowLevelMesh](https://developer.apple.com/documentation/realitykit/lowlevelmesh) ·
  [Compose interactive 3D content (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10102/)

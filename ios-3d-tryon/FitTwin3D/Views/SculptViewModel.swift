import SwiftUI
import RealityKit
import FitTwinCore

/// 捏人界面的 UI 侧状态（「UI 只读状态、发意图」，§4.1）。
///
/// 真相是 `weights` 字典；面板拖动改它，再调引擎广播给身体+衣服。
/// 引擎是 RealityKit 实现，但本类只通过 `SculptEngine` 协议形状与意图与它打交道。
@MainActor
@Observable
final class SculptViewModel {

    /// 当前各通道权重（UI 真相）。先全 0（中性 B-1）。
    var weights: [String: Float] = BodyChannel.neutralWeights

    /// 顶部提示（加载状态 / 通道同名诊断 / 错误）。
    var statusNote: String?

    /// B-2 实时尺寸读数（正交测量态会用；这里先算好备用）。
    var measurements: BodyMeasurements { engine.measurements(for: weights) }

    private let engine = RealityKitSculptEngine()

    /// 载入场景并把身体+衣服登记进引擎。返回根实体供 RealityView 添加。
    func makeContent() async -> Entity? {
        do {
            let root = try await ModelLoader.loadScene()
            let body = try ModelLoader.bodyEntity(in: root)
            let bodyChannels = engine.register(body)

            if let garment = ModelLoader.placeholderGarment(in: root) {
                let garmentChannels = engine.register(garment)
                // §5.4 ★★★ 诊断：身体与衣服必须有交集通道，否则一起形变无从谈起。
                let shared = bodyChannels.intersection(garmentChannels)
                statusNote = shared.isEmpty
                    ? "⚠️ 身体与衣服无同名通道——检查 §5.4 通道命名"
                    : "身体+衣服共享通道：\(shared.sorted().joined(separator: ", "))"
            } else {
                statusNote = "未找到占位衣服 \"Shirt\"——只驱动身体。"
            }

            engine.apply(weights: weights, skeleton: [:])
            return root
        } catch {
            statusNote = "加载 scene.usdz 失败：把 spike 的 scene.usdz 放进 App 资源即可。"
            return nil
        }
    }

    /// 面板滑块改动后广播（身体+在穿衣服同权重，§4.2）。
    func applyWeights() {
        engine.apply(weights: weights, skeleton: [:])
    }

    /// 复位中性身材。
    func reset() {
        weights = BodyChannel.neutralWeights
        applyWeights()
    }
}

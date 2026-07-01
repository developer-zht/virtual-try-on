import Foundation

/// 捏人引擎（SRS §4.4）：通道权重 → 模型形变 + 实时尺寸读数。
///
/// 协议本身是**纯的**（只收/发值类型，不 import RealityKit）——所以它住在 Core、可单测。
/// 具体实现 `RealityKitSculptEngine` 在 App target 里，把权重广播进
/// `BlendShapeWeightsComponent`（身体 + 所有在穿衣服，§4.2 单一权重源广播）。
/// UI 只「发意图」（调 `apply`）、只「读状态」（`measurements`），不碰 RealityKit。
public protocol SculptEngine: AnyObject {

    /// 把一组身材权重**同时**写入身体与所有在穿衣服的同名通道
    /// （单一权重源广播，§4.2 ——「同形变、不穿模」的根，Spike C 已验证机制）。
    /// - Parameter skeleton: 骨骼缩放参数（FR-1 辅助形变，无版本门槛）；本期可空。
    func apply(weights: [String: Float], skeleton: [String: Float])

    /// 正交测量态读数（§5.2 B-2 标定表）。纯计算，默认实现见下方扩展。
    func measurements(for weights: [String: Float]) -> BodyMeasurements
}

public extension SculptEngine {
    /// 默认实现：直接走纯计算的 B-2 标定器（与 RealityKit 无关，故可复用）。
    func measurements(for weights: [String: Float]) -> BodyMeasurements {
        MeasurementCalculator.measurements(for: weights)
    }
}

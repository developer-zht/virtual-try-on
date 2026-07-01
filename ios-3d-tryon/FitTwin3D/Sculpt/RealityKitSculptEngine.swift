import Foundation
import RealityKit
import FitTwinCore

/// `SculptEngine` 的 RealityKit 实现（kickoff ② 的核心）。
///
/// 职责：把一组身材权重**同时**广播进身体与所有在穿衣服的 `BlendShapeWeightsComponent`
/// ——这就是 §4.2 的「单一权重源广播」，是「同形变、不穿模」的根（Spike B/C 已验证机制）。
/// 测量读数走协议默认实现（纯 B-2 计算，见 FitTwinCore）。
@MainActor
final class RealityKitSculptEngine: SculptEngine {

    private struct Driven {
        let entity: Entity
        let binding: BlendShapeBinding
    }

    private var driven: [Driven] = []

    /// 当前身材（UI 真相的镜像）；新实体加入时立刻对齐到它。
    private(set) var currentWeights: [String: Float] = BodyChannel.neutralWeights

    /// 注册一个受驱动实体（身体或一件在穿衣服），并解析其通道位置表。
    /// 返回该实体实际带的通道名，便于上层诊断「身体↔衣服是否同名」（§5.4 ★★★）。
    @discardableResult
    func register(_ entity: Entity) -> Set<String> {
        if let existing = driven.first(where: { $0.entity === entity }) {
            return existing.binding.channelNames
        }
        guard let binding = BlendShapeBinding.resolve(for: entity) else { return [] }
        driven.append(Driven(entity: entity, binding: binding))
        binding.write(currentWeights, to: entity)   // 新加入即对齐当前身材
        return binding.channelNames
    }

    func unregister(_ entity: Entity) {
        driven.removeAll { $0.entity === entity }
    }

    // MARK: - SculptEngine

    func apply(weights: [String: Float], skeleton: [String: Float]) {
        currentWeights = weights
        for d in driven {
            d.binding.write(weights, to: d.entity)
        }
        // 骨骼缩放（FR-1 辅助形变）：本期占位。正式接 jointTransforms / 比例骨缩放。
        _ = skeleton
    }

    // measurements(for:) 用协议默认实现（MeasurementCalculator，纯 B-2 计算）。
}

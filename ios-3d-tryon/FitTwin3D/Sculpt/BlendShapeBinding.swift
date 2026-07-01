import Foundation
import RealityKit
import FitTwinCore

/// 把 RealityKit 的 BlendShape API **收口到一处**，便于真机核对与（如需）替换。
///
/// 为什么要收口：本文件依赖 iOS 18 的 `BlendShapeWeightsComponent`，
/// 该 API 较新、文档稀疏，且**无法在无设备/无 Xcode 处编译验证**。把所有触点关进一个
/// 小结构里，其余引擎/UI 代码就与具体符号名解耦——真机若有个别符号名出入，只改这一文件。
///
/// ⚠️ 真机核对清单（结构是对的，只需在 Xcode 自动补全里确认 2 个符号名）：
///   1. 取/建组件：`BlendShapeWeightsMapping(meshResource:)` →
///      `BlendShapeWeightsComponent(weightsMapping:)`（载入的 usdz 若已带组件则直接复用）。
///   2. 逐通道名定位：从 `BlendShapeWeights` 取「逐个权重名」数组（与 `.weights` 一一对应、同序）。
///   3. 写值：`component.weightSet[i].weights[j] = w`，随后 `entity.components.set(component)`（★值类型写回）。
/// 文档：
///   https://developer.apple.com/documentation/realitykit/blendshapeweightscomponent
///   https://developer.apple.com/documentation/realitykit/blendshapeweightsmapping
///   https://developer.apple.com/documentation/realitykit/blendshapeweights
@MainActor
struct BlendShapeBinding {

    /// 通道名 → 该名字在 weightSet 里的所有出现位置。
    /// 用「数组」是因为一个实体可能由多个带同名 morph 的 mesh 部件组成。
    private let locations: [String: [(set: Int, weight: Int)]]

    /// 从实体解析：确保它有 `BlendShapeWeightsComponent`，并预建「通道名 → 位置」表。
    /// 预建一次、之后每帧 `write` 只做 O(命中通道数) 的写入——且**按名定位、不硬编 index**（§4.2）。
    static func resolve(for entity: Entity) -> BlendShapeBinding? {
        ensureComponent(on: entity)
        guard let component = entity.components[BlendShapeWeightsComponent.self] else { return nil }

        var map: [String: [(set: Int, weight: Int)]] = [:]
        for s in component.weightSet.indices {
            let names = weightNames(component.weightSet[s])          // 核对点 2
            for (w, name) in names.enumerated() {
                map[name, default: []].append((set: s, weight: w))
            }
        }
        return BlendShapeBinding(locations: map)
    }

    /// 该实体实际带的通道名（用于诊断「身体/衣服通道是否同名」，§5.4 最易翻车处）。
    var channelNames: Set<String> { Set(locations.keys) }

    /// 把权重按通道名写入实体（命中才写，资产没有的通道忽略）。值类型改完写回（§4.2）。
    func write(_ weights: [String: Float], to entity: Entity) {
        guard var component = entity.components[BlendShapeWeightsComponent.self] else { return }
        for (channel, value) in weights {
            guard let locs = locations[channel] else { continue }
            for loc in locs {
                component.weightSet[loc.set].weights[loc.weight] = value
            }
        }
        entity.components.set(component)   // ★ Component 是 struct，必须写回
    }

    // MARK: - 真机核对触点（无法在此编译；符号名以 Xcode 为准）

    /// 核对点 1：USDZ 载入后若已带 BlendShapeWeightsComponent 就用，否则从模型 mesh 建。
    private static func ensureComponent(on entity: Entity) {
        if entity.components[BlendShapeWeightsComponent.self] != nil { return }
        guard let model = entity.components[ModelComponent.self] else { return }
        let mapping = BlendShapeWeightsMapping(meshResource: model.mesh)
        entity.components.set(BlendShapeWeightsComponent(weightsMapping: mapping))
    }

    /// 核对点 2：取某 `BlendShapeWeights` 的逐权重名（与 `.weights` 一一对应、同序）。
    /// 若该属性名在你的 SDK 上不同（如 `names`），改这一行即可，其余逻辑不变。
    private static func weightNames(_ weights: BlendShapeWeights) -> [String] {
        weights.weightNames
    }
}

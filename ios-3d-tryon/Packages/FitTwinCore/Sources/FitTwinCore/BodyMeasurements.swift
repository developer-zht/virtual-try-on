import Foundation

/// 正交测量态的尺寸读数（FR-1 锁视角 / FR-6）。单位：米。
///
/// 只含**比例类**通道能给出的真实尺寸；围度类（胖瘦等）不在此（B-5）。
public struct BodyMeasurements: Sendable, Equatable {
    /// 度量名 → 米值（如 "stature" → 1.73）。键 = §5.2 `Calibration.metric`。
    public var metersByMetric: [String: Float]
    public init(metersByMetric: [String: Float] = [:]) {
        self.metersByMetric = metersByMetric
    }
    public func meters(_ metric: String) -> Float? { metersByMetric[metric] }
}

/// B-2 标定计算器：权重 ↔ 真实尺寸的**双向**换算。纯函数、确定性、可单测。
///
/// 线性近似（假设 B-3 单调、近似解耦）。两个方向各服务一条需求：
///  • 正向 `measurements(for:)`：weights → 米读数 —— FR-1 正交测量态实时读数。
///  • 反向 `weights(forMeasuredMeters:)`：米 → 权重 —— FR-2 ARKit 反解 seed（仅比例类）。
public enum MeasurementCalculator {

    /// 正向：一组通道权重 → 真实尺寸读数（米）。只算有标定的通道。
    public static func measurements(for weights: [String: Float],
                                    channels: [BodyChannel.Definition] = BodyChannel.catalog) -> BodyMeasurements {
        var out: [String: Float] = [:]
        for def in channels {
            guard let cal = def.calibration else { continue }
            let w = (weights[def.id] ?? def.defaultWeight).clampedToUnit(def.range)
            out[cal.metric] = cal.minMeters + (cal.maxMeters - cal.minMeters) * w
        }
        return BodyMeasurements(metersByMetric: out)
    }

    /// 反解：真实尺寸（米）→ 通道权重。**仅比例类**（B-5：围度类绝不写入）。
    /// 超范围按 B-6 clamp 到 0...1。用于 FR-2 ARKit seed（围度保持手动）。
    public static func weights(forMeasuredMeters meters: [String: Float],
                               channels: [BodyChannel.Definition] = BodyChannel.catalog) -> [String: Float] {
        var out: [String: Float] = [:]
        for def in channels where def.kind == .proportion {
            guard let cal = def.calibration, let m = meters[cal.metric] else { continue }
            let span = cal.maxMeters - cal.minMeters
            guard span != 0 else { continue }
            out[def.id] = ((m - cal.minMeters) / span).clampedToUnit(0...1)
        }
        return out
    }
}

private extension Float {
    /// 截断到给定区间（B-6：超范围 clamp 到最接近值）。
    func clampedToUnit(_ r: ClosedRange<Float>) -> Float {
        Swift.min(Swift.max(self, r.lowerBound), r.upperBound)
    }
}

import Foundation

/// 身材通道（Body channel）—— SRS §5.2 的代码化真相。
///
/// 终态约 8~10 个；每个驱动一份 morph，运行时改权重即改形状（无需重导模型）。
/// 命名契约（§5.4 ★★★）：通道 id = `k_` 前缀 + 小驼峰，身体与每件衣服**逐一同名**——
/// 这是「单一权重源广播、不穿模」的根。运行时**按名取用、绝不硬编 index**。
public enum BodyChannel {

    /// 通道分两类（§5.2 / FR-2 的 B-5）：
    ///  • 比例类（proportion）：身高/腿长/臂长/肩宽/脸宽 —— ARKit 骨架可反解 seed。
    ///  • 围度类（girth）：胖瘦/肌肉/胸/腰/臀 —— 骨架量不到，**永远手动**。
    public enum Kind: String, Sendable, Codable, Equatable {
        case proportion
        case girth
    }

    /// 一个通道的静态定义（id + 元数据）。值类型、可 Sendable、可在 UI ForEach 里用。
    public struct Definition: Sendable, Identifiable, Equatable {
        /// = morph 通道名，如 "k_weight"（§5.4 命名契约；同时是 UI 与持久层的字典键）。
        public let id: String
        /// 折叠面板里给人看的名字（FR-1）。
        public let displayName: String
        public let kind: Kind
        /// 折叠分组（FR-1：面板支持折叠分组）。
        public let group: String
        /// 默认 0 = 中性基准（B-1）。
        public let defaultWeight: Float
        /// 内部权重区间，恒 0...1（§5.2）。
        public let range: ClosedRange<Float>
        /// B-2 标定：权重 ↔ 真实尺寸（仅比例类有；围度类为 nil）。
        public let calibration: Calibration?

        public init(id: String,
                    displayName: String,
                    kind: Kind,
                    group: String,
                    defaultWeight: Float = 0,
                    range: ClosedRange<Float> = 0...1,
                    calibration: Calibration? = nil) {
            self.id = id
            self.displayName = displayName
            self.kind = kind
            self.group = group
            self.defaultWeight = defaultWeight
            self.range = range
            self.calibration = calibration
        }
    }

    /// B-2 标定表项：权重 0→1 对应某真实尺寸（米）从 `minMeters`→`maxMeters` **线性**变化。
    ///
    /// 既供 FR-2（ARKit 量到尺寸 → 反查权重 seed），也供 FR-1 正交测量态实时读数。
    /// 线性近似的前提是 B-3「单调、近似解耦」；min 值 = 中性基准（B-1，权重 0 时量出来的值）。
    public struct Calibration: Sendable, Equatable {
        /// 度量名，如 "stature"（站立身高）。= FR-1 读数 / FR-2 反解的查表键。
        public let metric: String
        public let minMeters: Float
        public let maxMeters: Float
        public init(metric: String, minMeters: Float, maxMeters: Float) {
            self.metric = metric
            self.minMeters = minMeters
            self.maxMeters = maxMeters
        }
    }
}

public extension BodyChannel {

    // MARK: - 通道 id 常量（收口，避免到处写裸字符串）—— §5.4 命名契约

    static let height    = "k_height"
    static let legLength = "k_legLength"
    static let armLength = "k_armLength"
    static let shoulder  = "k_shoulder"
    static let weight    = "k_weight"
    static let muscle    = "k_muscle"
    static let chest     = "k_chest"
    static let waist     = "k_waist"
    static let hip       = "k_hip"
    static let faceWidth = "k_faceWidth"

    /// §5.2 终态通道目录（8~10 个）。
    ///
    /// ⚠️ 标定的 min/max 米值是**占位**，待正式资产把 B-2 标定表随资产烘焙后回填。
    /// 占位值只为让 FR-1 读数 / FR-2 反解的代码路径今天就能跑通与单测。
    static let catalog: [Definition] = [
        // 比例类（ARKit 可 seed）
        .init(id: height, displayName: "身高", kind: .proportion, group: "比例",
              calibration: .init(metric: "stature", minMeters: 1.45, maxMeters: 2.00)),
        .init(id: legLength, displayName: "腿长", kind: .proportion, group: "比例",
              calibration: .init(metric: "hipToAnkle", minMeters: 0.70, maxMeters: 1.05)),
        .init(id: armLength, displayName: "臂长", kind: .proportion, group: "比例",
              calibration: .init(metric: "shoulderToWrist", minMeters: 0.52, maxMeters: 0.72)),
        .init(id: shoulder, displayName: "肩宽", kind: .proportion, group: "比例",
              calibration: .init(metric: "biacromial", minMeters: 0.32, maxMeters: 0.50)),
        // 围度类（仅手动，B-5：自动量身绝不写入）
        .init(id: weight, displayName: "胖瘦", kind: .girth, group: "围度"),
        .init(id: muscle, displayName: "肌肉量", kind: .girth, group: "围度"),
        .init(id: chest, displayName: "胸围", kind: .girth, group: "围度"),
        .init(id: waist, displayName: "腰围", kind: .girth, group: "围度"),
        .init(id: hip, displayName: "臀围", kind: .girth, group: "围度"),
        // 可选脸通道
        .init(id: faceWidth, displayName: "脸宽", kind: .proportion, group: "脸",
              calibration: .init(metric: "bizygomatic", minMeters: 0.11, maxMeters: 0.16)),
    ]

    static func definition(for id: String) -> Definition? {
        catalog.first { $0.id == id }
    }

    /// 全 0 的中性身材（B-1 中性基准）。新建 BodyModel / 面板复位用。
    static var neutralWeights: [String: Float] {
        Dictionary(uniqueKeysWithValues: catalog.map { ($0.id, $0.defaultWeight) })
    }
}

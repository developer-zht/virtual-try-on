import Foundation

// 设计文档（Design Doc）—— SRS §6.1：一套纹理的**结构化真相**，PNG 是其确定性渲染产物。
//
// 这里只放**纯值类型**（Codable）；SwiftData 的 @Model（§7.2 `TextureDesignDoc`）内嵌
// 这些类型作为属性，避免重复定义、保证 DB 与 §6.1 JSON 同构。
// 本期脚手架只建模型，不接 AI / 本地渲染器（留到 M2）。

/// 区域填充（§6.1 / §7.2 `RegionFill`）。
public struct RegionFill: Codable, Sendable, Equatable {
    public enum Kind: String, Codable, Sendable { case color, pattern, generated }

    public var fill: Kind
    public var color: String?              // #RRGGBB（fill = color）
    public var pattern: String?            // 图案类型（fill = pattern）
    public var params: [String: Double]?   // 图案参数（角度/密度…）
    public var colors: [String]?           // 配色
    public var genRef: String?             // AI 产物引用（fill = generated）
    public var tint: String?               // 可叠加色调

    public init(fill: Kind,
                color: String? = nil,
                pattern: String? = nil,
                params: [String: Double]? = nil,
                colors: [String]? = nil,
                genRef: String? = nil,
                tint: String? = nil) {
        self.fill = fill
        self.color = color
        self.pattern = pattern
        self.params = params
        self.colors = colors
        self.genRef = genRef
        self.tint = tint
    }
}

/// 来源出处（§6.1 `baseProvenance`）。
public struct Provenance: Codable, Sendable, Equatable {
    public var input: String               // "text" | "image"
    public var refImageRef: String?
    public var providerModel: String?
    public init(input: String, refImageRef: String? = nil, providerModel: String? = nil) {
        self.input = input
        self.refImageRef = refImageRef
        self.providerModel = providerModel
    }
}

/// 设计文档整体（§6.1）。`renderHash` 命中即复用 PNG（§6.6 缓存键）。
public struct DesignDoc: Codable, Sendable, Equatable {
    public var id: String
    public var version: Int
    public var garmentCategory: String
    public var garmentAssetRef: String
    public var regions: [String: RegionFill]
    public var baseProvenance: Provenance?
    public var renderHash: String?

    public init(id: String,
                version: Int,
                garmentCategory: String,
                garmentAssetRef: String,
                regions: [String: RegionFill] = [:],
                baseProvenance: Provenance? = nil,
                renderHash: String? = nil) {
        self.id = id
        self.version = version
        self.garmentCategory = garmentCategory
        self.garmentAssetRef = garmentAssetRef
        self.regions = regions
        self.baseProvenance = baseProvenance
        self.renderHash = renderHash
    }
}

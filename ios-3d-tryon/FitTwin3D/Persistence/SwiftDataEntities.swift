import Foundation
import SwiftData
import FitTwinCore   // 复用 RegionFill / Provenance（§6.1 纯值类型），避免重复定义

// §7.2 SwiftData 实体骨架。
//
// 约定（§7.2 / §7.3）：
//  • 大文件（usdz / 纹理 PNG / AI 图）一律以**相对沙盒路径字符串**存字段，DB 只存路径。
//  • 枚举以 `String` raw 存（便于迁移）；通道权重用 `[String: Float]`（加新通道无需改 schema）。
//  • 本期只建模型 + 接 ModelContainer，**不接网络/AI**。

// MARK: - 用户存档（可选根容器，cascade 管理其下数据）

@Model
final class UserArchive {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade) var bodyModels: [BodyModel]
    @Relationship(deleteRule: .cascade) var outfits: [Outfit]
    @Relationship(deleteRule: .cascade) var designDocs: [TextureDesignDoc]

    init(id: UUID = UUID(),
         name: String,
         createdAt: Date = .now,
         bodyModels: [BodyModel] = [],
         outfits: [Outfit] = [],
         designDocs: [TextureDesignDoc] = []) {
        self.id = id
        self.name = name
        self.createdAt = createdAt
        self.bodyModels = bodyModels
        self.outfits = outfits
        self.designDocs = designDocs
    }
}

// MARK: - 模特状态（捏人结果）

@Model
final class BodyModel {
    @Attribute(.unique) var id: UUID
    var name: String
    var isDefault: Bool
    var source: String                  // BodySource: manual | arkit | mixed
    var baseBodyId: String              // 用哪具基础人体（男/女 usdz）
    var channelWeights: [String: Float] // §5.2 通道 id → 0..1（围度类必手动）
    var skeletonScale: [String: Float]  // 骨骼缩放
    var updatedAt: Date

    init(id: UUID = UUID(),
         name: String,
         isDefault: Bool = false,
         source: String = "manual",
         baseBodyId: String,
         channelWeights: [String: Float],
         skeletonScale: [String: Float] = [:],
         updatedAt: Date = .now) {
        self.id = id
        self.name = name
        self.isDefault = isDefault
        self.source = source
        self.baseBodyId = baseBodyId
        self.channelWeights = channelWeights
        self.skeletonScale = skeletonScale
        self.updatedAt = updatedAt
    }
}

// MARK: - 衣服资产目录（库内只读元数据；AssetIndex = 对它的查询，§5.5）

@Model
final class GarmentAsset {
    @Attribute(.unique) var assetId: String   // = manifest.assetId / prim 名后缀
    var category: String                       // taxonomy 枚举
    var slot: String                           // §5.10 槽位
    var usdzPath: String
    var uvTemplatePath: String
    var segmentationMapPath: String
    var bodyHidingPath: String?
    var pushOut: Float
    var channels: [String]                     // 实带通道子集（§5.2 同名）
    var semanticRegions: [String]              // §6.2 区域 id
    var materialSlot: String                   // "mat_basecolor"
    var variantsJSON: String?                  // 子属性变体（Codable JSON 串）
    var license: String                        // "CC0"
    var source: String                         // "MakeHuman"

    init(assetId: String,
         category: String,
         slot: String,
         usdzPath: String,
         uvTemplatePath: String = "",
         segmentationMapPath: String = "",
         bodyHidingPath: String? = nil,
         pushOut: Float = 0,
         channels: [String] = [],
         semanticRegions: [String] = [],
         materialSlot: String = NamingContract.baseColorMaterialSlot,
         variantsJSON: String? = nil,
         license: String = "CC0",
         source: String = "MakeHuman") {
        self.assetId = assetId
        self.category = category
        self.slot = slot
        self.usdzPath = usdzPath
        self.uvTemplatePath = uvTemplatePath
        self.segmentationMapPath = segmentationMapPath
        self.bodyHidingPath = bodyHidingPath
        self.pushOut = pushOut
        self.channels = channels
        self.semanticRegions = semanticRegions
        self.materialSlot = materialSlot
        self.variantsJSON = variantsJSON
        self.license = license
        self.source = source
    }
}

// MARK: - 纹理设计文档（§6.1 真相；PNG 为渲染产物）

@Model
final class TextureDesignDoc {
    @Attribute(.unique) var id: UUID
    var version: Int
    var garmentCategory: String
    var garmentAssetId: String                 // → GarmentAsset.assetId
    var regions: [String: RegionFill]          // 区域 id → 填充（Codable，§6.1，复用自 FitTwinCore）
    var baseProvenance: Provenance?
    var renderHash: String                     // 缓存键（§6.6）
    var renderedPNGPath: String?               // 渲染产物路径（可空，可随时重建）
    var createdAt: Date

    init(id: UUID = UUID(),
         version: Int = 1,
         garmentCategory: String,
         garmentAssetId: String,
         regions: [String: RegionFill] = [:],
         baseProvenance: Provenance? = nil,
         renderHash: String = "",
         renderedPNGPath: String? = nil,
         createdAt: Date = .now) {
        self.id = id
        self.version = version
        self.garmentCategory = garmentCategory
        self.garmentAssetId = garmentAssetId
        self.regions = regions
        self.baseProvenance = baseProvenance
        self.renderHash = renderHash
        self.renderedPNGPath = renderedPNGPath
        self.createdAt = createdAt
    }
}

// MARK: - 搭配（一套穿好的）

@Model
final class Outfit {
    @Attribute(.unique) var id: UUID
    var name: String
    @Relationship var bodyModel: BodyModel?
    @Relationship(deleteRule: .cascade) var items: [OutfitItem]
    var createdAt: Date

    init(id: UUID = UUID(),
         name: String,
         bodyModel: BodyModel? = nil,
         items: [OutfitItem] = [],
         createdAt: Date = .now) {
        self.id = id
        self.name = name
        self.bodyModel = bodyModel
        self.items = items
        self.createdAt = createdAt
    }
}

@Model
final class OutfitItem {                        // 一件已穿衣服 + 它的纹理
    @Attribute(.unique) var id: UUID
    var slot: String                            // §5.10
    var garmentAssetId: String                  // → GarmentAsset
    var designDocId: UUID?                       // → TextureDesignDoc

    init(id: UUID = UUID(),
         slot: String,
         garmentAssetId: String,
         designDocId: UUID? = nil) {
        self.id = id
        self.slot = slot
        self.garmentAssetId = garmentAssetId
        self.designDocId = designDocId
    }
}

// MARK: - 同意记录（NFR-3）

@Model
final class ConsentRecord {
    @Attribute(.unique) var id: UUID
    var scopeText: String
    var providerName: String
    var retentionNote: String
    var grantedAt: Date
    var version: String

    init(id: UUID = UUID(),
         scopeText: String,
         providerName: String,
         retentionNote: String,
         grantedAt: Date = .now,
         version: String) {
        self.id = id
        self.scopeText = scopeText
        self.providerName = providerName
        self.retentionNote = retentionNote
        self.grantedAt = grantedAt
        self.version = version
    }
}

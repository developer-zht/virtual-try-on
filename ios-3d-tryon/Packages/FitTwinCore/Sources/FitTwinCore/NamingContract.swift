import Foundation

/// §5.4 命名与对齐契约的代码化常量（运行时按名取用，必须稳定）。
///
/// 这些名字是在**离线资产阶段**（Blender 里）命名的，构成「命名契约」；
/// 运行时据此 `findEntity(named:)` 取实体、定位可替换材质槽。改名 = 资产与代码一起改。
public enum NamingContract {

    /// 身体 prim 名 —— `findEntity(named: "Body")`。
    public static let bodyPrimName = "Body"

    /// 衣服 prim 名前缀；完整名 = 前缀 + assetId（assetId 全局唯一、小写 + 下划线）。
    public static let garmentPrimPrefix = "Garment_"
    public static func garmentPrimName(assetId: String) -> String {
        garmentPrimPrefix + assetId
    }

    /// 单一 UV set，全在 0–1、不重叠（AI 纹理 / 语义区域对齐）。
    public static let uvSet = "st"

    /// 每件衣服一个可替换 base color 材质槽名（运行时换纹理，FR-3/FR-7）。
    public static let baseColorMaterialSlot = "mat_basecolor"

    /// spike 占位资产里衣服实体的名字。
    /// kickoff ②：占位资产用 spike 命名 `Shirt`；正式资产将是 `Garment_<assetId>`。
    public static let spikePlaceholderGarmentName = "Shirt"
}

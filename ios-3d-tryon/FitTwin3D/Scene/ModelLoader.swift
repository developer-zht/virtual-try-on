import Foundation
import RealityKit
import FitTwinCore

/// 加载占位资产 `scene.usdz`，并按 §5.4 命名契约取出身体与（占位）衣服实体。
///
/// 占位资产用 spike 命名：`Body` / `Shirt`；正式资产将是 `Body` / `Garment_<assetId>`。
/// 把 scene.usdz 放进 App 资源即可（见 Resources/PUT_scene.usdz_HERE.md）。
enum ModelLoader {

    enum LoadError: Error, LocalizedError {
        case bodyNotFound
        var errorDescription: String? {
            switch self {
            case .bodyNotFound: return "scene.usdz 里找不到名为 \"Body\" 的实体（§5.4 命名契约）。"
            }
        }
    }

    /// 从 App bundle 异步载入 `scene.usdz` 根实体。
    @MainActor
    static func loadScene(named name: String = "scene") async throws -> Entity {
        try await Entity(named: name, in: Bundle.main)
    }

    /// 在根实体下按名找身体（§5.4：`Body`）。
    @MainActor
    static func bodyEntity(in root: Entity) throws -> Entity {
        guard let body = root.findEntity(named: NamingContract.bodyPrimName) else {
            throw LoadError.bodyNotFound
        }
        return body
    }

    /// 在根实体下按名找占位衣服（spike 命名 `Shirt`）。找不到返回 nil（只驱动身体）。
    @MainActor
    static func placeholderGarment(in root: Entity) -> Entity? {
        root.findEntity(named: NamingContract.spikePlaceholderGarmentName)
    }
}

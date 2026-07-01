import SwiftUI
import SwiftData

/// ② 脚手架 App 入口。
///
/// 普通 App 模板（**非 AR**）、最低 iOS 18、SwiftUI（kickoff ②）。
/// 这里把 SwiftData 的 `ModelContainer` 接好（§7.2 实体骨架）——先不接网络/AI。
@main
struct FitTwin3DApp: App {

    /// SwiftData 容器：声明 §7.2 全部 @Model 实体。
    let modelContainer: ModelContainer = {
        let schema = Schema([
            UserArchive.self,
            BodyModel.self,
            GarmentAsset.self,
            TextureDesignDoc.self,
            Outfit.self,
            OutfitItem.self,
            ConsentRecord.self
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("无法创建 ModelContainer：\(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(modelContainer)
    }
}

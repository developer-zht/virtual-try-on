import SwiftUI

/// ① RISK-10 spike 的独立 App 入口。
///
/// 独立 Target（用完即弃，与正式工程 FitTwin3D 隔离）。普通 App 模板、最低 iOS 18、SwiftUI。
@main
struct OrthoSpikeApp: App {
    var body: some Scene {
        WindowGroup {
            OrthoSpikeView()
        }
    }
}

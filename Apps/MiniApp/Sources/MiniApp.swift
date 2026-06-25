import SwiftUI
import ImageUploadFeature

/// Mini app 的入口。注意这个壳有多薄——它几乎没有代码：
/// 只负责「启动后显示哪个页面」。真正的功能全在 StyleTwinKit 包里，
/// 那部分你在 VSCode 里写就行，基本不用碰 Xcode。
@main
struct MiniApp: App {
    var body: some Scene {
        WindowGroup {
            // 默认走假接口。后端就绪后改成：
            // ImageUploadView(service: HTTPImageUploadService(
            //     endpoint: URL(string: "https://api.styletwin.app/v1/tryon")!))
            ImageUploadView()
        }
    }
}

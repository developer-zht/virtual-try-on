// swift-tools-version: 5.9
import PackageDescription

// AIKit —— 跨 App 复用的「AI 管道」，与具体业务无关。
// Core 零 SwiftUI、零穿搭逻辑；详见仓库 docs/cross-app-ai-sharing.md。
// 平台定 iOS 17 / macOS 14：ChatSession 用 @Observable（Observation 框架）。
let package = Package(
    name: "AIKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "AIKitCore", targets: ["AIKitCore"])
        // AIKitUI（通用聊天 SwiftUI 组件）将在「任务③：聊天组件」时加入。
    ],
    targets: [
        .target(name: "AIKitCore"),
        .testTarget(name: "AIKitCoreTests", dependencies: ["AIKitCore"])
    ]
)

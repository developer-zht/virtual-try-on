// swift-tools-version: 5.9
import PackageDescription

// FitTwinCore —— 3D 试衣分身 App 的「纯逻辑核心」。
//
// 纪律（对齐 SRS §4.1「引擎只算、UI 只画」与 NFR-6「引擎可单测」）：
//   • 零 SwiftUI、零 RealityKit、零 SwiftData —— 只有可在**任意平台**单测的纯 Swift。
//   • RealityKit / SwiftData / SwiftUI 的胶水代码住在 App target（见 ../../README.md）。
// 这样把「不穿模的根（§5.4 通道名）」「B-2 标定数学」「换装互斥规则」等关键路径
// 关进一个可单测、可跨 App 复用、与设备无关的盒子里。
let package = Package(
    name: "FitTwinCore",
    platforms: [
        .iOS(.v18),
        .macOS(.v13)
    ],
    products: [
        .library(name: "FitTwinCore", targets: ["FitTwinCore"])
    ],
    targets: [
        .target(name: "FitTwinCore"),
        .testTarget(name: "FitTwinCoreTests", dependencies: ["FitTwinCore"])
    ]
)

// swift-tools-version: 5.9
import PackageDescription

// StyleTwinKit —— 穿搭分身各 app（mini / demo / test / full）共享的「功能模块」集合。
// 每个功能一个 target（library），app 端按需挑着用。
// 真正的业务代码都在这里写，便于在 VSCode 里用 SourceKit-LSP 编辑/编译。
let package = Package(
    name: "StyleTwinKit",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        // 上传图片功能：相册/拍照上传 + 后端回显。
        .library(name: "ImageUploadFeature", targets: ["ImageUploadFeature"])
    ],
    targets: [
        .target(name: "ImageUploadFeature")
    ]
)

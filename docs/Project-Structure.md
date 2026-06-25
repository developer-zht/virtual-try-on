# 工程结构与本地开发（多 app + VSCode 工作流）

本仓库是**单仓库多 app（monorepo）**：mini / demo / test / full 四个 app 共享同一套核心代码。
核心代码放在 **Swift Package** 里（用 VSCode 编辑），每个 app 只是引用这些包的**薄壳**。

## 目录结构

```
Project_Virtual-Try-On/         ← 仓库根 = 你本机的「根路径」
├── Apps/                        ← 各 app 的薄壳（壳里几乎没代码）
│   └── MiniApp/
│       ├── project.yml          ← XcodeGen 配置（描述工程，生成 .xcodeproj）
│       └── Sources/MiniApp.swift← @main 入口，只决定启动显示哪个页面
├── StyleTwinKit/                ← 共享功能包（业务代码主战场）
│   └── Sources/ImageUploadFeature/   上传图片功能
├── AIKit/                       ← 已有的 AI 共享层（独立 Package）
├── docs/
├── .vscode/                     ← VSCode 配置（Swift 扩展 + 推荐插件）
└── .gitignore
```

> 加新 app（demo/test/full）= 复制一份 `Apps/MiniApp/` 改名、调 `project.yml` 即可。
> 加新功能 = 在 `StyleTwinKit/Sources/` 下加一个 target，各 app 按需引用。

## 能多 app 共存吗？能。

四个 app 共享 `StyleTwinKit` / `AIKit`：改一处功能，四个 app 都生效。
区别只在各自的薄壳里——比如 test app 用 `MockImageUploadService`，full app 用 `HTTPImageUploadService`。

## 一次性准备（在 Mac 上）

```bash
# 1) 安装 XcodeGen（从文本生成 Xcode 工程，免去手点和 git 冲突）
brew install xcodegen

# 2) VSCode 装官方 Swift 扩展（打开仓库会自动提示，见 .vscode/extensions.json）
#    扩展 id：swiftlang.swift-vscode
```

> iOS app 的**编译/跑模拟器/真机签名**离不开 Xcode 工具链（命令行 `xcodebuild` 也是它装的）。
> 但**写代码**全程可在 VSCode：包里的代码有补全/跳转/报错。Xcode 只在「按运行」时短暂用一下。

## 日常开发流程

**写代码（VSCode）**：直接打开仓库根目录，编辑 `StyleTwinKit/` 里的文件。
保存即由 SourceKit-LSP 检查；想纯命令行编译这个包（语法层面）：

```bash
# 注意：本包用了 UIKit/SwiftUI，只能在 macOS 上、指向 iOS SDK 编译
swift build --package-path StyleTwinKit       # 仅 macOS 可用
```

**生成 / 打开工程（首次或改了 project.yml 后）**：

```bash
cd Apps/MiniApp
xcodegen generate        # 生成 MiniApp.xcodeproj（已 gitignore，不入库）
```

**编译并跑模拟器（命令行，不开 Xcode 界面）**：

```bash
cd Apps/MiniApp
# 列出可用模拟器
xcrun simctl list devices
# 构建并安装到模拟器（示例选 iPhone 15）
xcodebuild -project MiniApp.xcodeproj -scheme MiniApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' build
```

> 想点界面运行时，仍可 `open MiniApp.xcodeproj` 用 Xcode 跑——但代码编辑回到 VSCode。

## 后端就绪后怎么切真接口

改 `Apps/MiniApp/Sources/MiniApp.swift` 里的一行：

```swift
ImageUploadView()                                   // 假接口
// ↓ 换成
ImageUploadView(service: HTTPImageUploadService(
    endpoint: URL(string: "https://api.styletwin.app/v1/tryon")!,
    fieldName: "file"))
```

并核对 `StyleTwinKit/Sources/ImageUploadFeature/ImageUploadService.swift` 里的 3 处 `TODO`
（返回 JSON 结构、DTO 字段名、上传字段名）。

## 待定 / 可演进

- 多 app 都建好后，可加一个根 `*.xcworkspace`（或用 XcodeGen 的多工程聚合）一起打开。
- `AIKit` 目前在根目录；若想和 `StyleTwinKit` 一起收进 `Packages/`，需同步更新
  `docs/cross-app-ai-sharing.md` 里的路径引用，单独开一次小重构再做。
```

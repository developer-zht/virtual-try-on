# 上传图片页（ImageUpload）

相册上传 + 拍照上传 → 传给后端 → 把后端返回的图片回显在本页。后端接口未就绪，**默认走假接口占位**。

## 文件结构

| 文件 | 职责 |
|------|------|
| `ImageUploadView.swift` | SwiftUI 页面（两个上传入口 + 预览 + 结果回显） |
| `ImageUploadViewModel.swift` | 状态机与逻辑（`@Observable`，iOS 17） |
| `ImageUploadService.swift` | 数据契约 + 服务抽象 + 假接口 + 真 HTTP 实现 |
| `CameraPicker.swift` | 桥接 UIKit 相机（SwiftUI 无原生相机视图） |

## 接入步骤

1. 把这 4 个 `.swift` 拖进 Xcode 的 app target（确保勾选 Target Membership）。
2. 在某个入口展示页面，例如：
   ```swift
   ImageUploadView()
   ```
3. 在 app 的 **Info.plist** 加权限说明（拍照必需，否则一拍即崩）：
   - `NSCameraUsageDescription` —— 例：`用于拍摄你的穿搭照片`
   - `NSPhotoLibraryUsageDescription` —— 用原生 `PhotosPicker` 其实可不加，但建议补上以防扩展。

> 相册用的是 iOS 16+ 的 `PhotosPicker`，系统自带受限选择，无需申请相册权限。

## 后端就绪后怎么切（UI 一行不用改）

把 View 里这一行：
```swift
@State private var viewModel = ImageUploadViewModel()                 // 默认假接口
```
改成注入真接口：
```swift
@State private var viewModel = ImageUploadViewModel(
    service: HTTPImageUploadService(
        endpoint: URL(string: "https://api.styletwin.app/v1/tryon")!, // 后端端点
        fieldName: "file"                                             // 表单字段名
    )
)
```

然后核对 `ImageUploadService.swift` 里的 3 处 `TODO`：

- **TODO①** 返回 JSON 结构（当前假设 `{ "imageUrl": "https://..." }`）。
- **TODO②** DTO 字段名与后端文档对齐。
- 上传字段名（`fieldName`，当前默认 `"file"`）。

## 假接口行为

`MockImageUploadService` 延迟 1.5s 模拟网络，返回 `picsum.photos` 随机图。换不同图片回显也不同，方便肉眼确认链路通了。

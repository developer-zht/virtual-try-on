import SwiftUI
import Observation

/// 上传图片页的「状态机 + 逻辑」。
///
/// 把选图/上传/回显的状态从 View 抽出来，View 只管画 UI。
/// 用 iOS 17 的 `@Observable`（和 AIKit 的 ChatSession 一致），属性一变 UI 自动刷新。
@Observable
@MainActor
final class ImageUploadViewModel {

    /// 上传阶段，UI 据此切换显示。
    enum Phase: Equatable {
        case idle               // 还没选图
        case picked             // 选了图，待上传
        case uploading          // 上传中
        case done               // 拿到结果图
        case failed(String)     // 出错，带错误文案
    }

    /// 用户选/拍的原图（本地预览用）。
    var localImage: UIImage?
    /// 后端返回的结果图地址（回显用）。
    private(set) var resultImageURL: URL?
    /// 当前阶段。
    private(set) var phase: Phase = .idle

    private let service: ImageUploadService

    /// 依赖注入：默认塞假接口；真接口就绪后传入 `HTTPImageUploadService(...)` 即可，本类不用改。
    init(service: ImageUploadService = MockImageUploadService()) {
        self.service = service
    }

    /// 选好一张图（相册或相机都汇到这里）。
    func setImage(_ image: UIImage) {
        localImage = image
        resultImageURL = nil
        phase = .picked
    }

    /// 上传当前图片，成功后把结果图地址存起来供回显。
    func upload() async {
        guard let image = localImage,
              let data = image.jpegData(compressionQuality: 0.9) else {
            phase = .failed("没有可上传的图片")
            return
        }

        phase = .uploading
        do {
            let result = try await service.upload(imageData: data, mime: "image/jpeg")
            resultImageURL = result.resultImageURL
            phase = .done
        } catch {
            phase = .failed(Self.message(for: error))
        }
    }

    /// 把错误翻译成给用户看的人话。
    private static func message(for error: Error) -> String {
        switch error {
        case UploadError.http(let status): return "服务器错误（\(status)）"
        case UploadError.invalidResponse:  return "服务器响应异常"
        case UploadError.decoding(let m):  return "解析失败：\(m)"
        default:                           return "上传失败：\(error.localizedDescription)"
        }
    }
}

import SwiftUI
import UIKit

/// 相机拍照视图。
///
/// SwiftUI 自己没有原生「打开相机拍照」的视图，要桥接 UIKit 的
/// `UIImagePickerController`。`UIViewControllerRepresentable` 就是把一个
/// UIKit 控制器包成 SwiftUI View 的官方桥。
struct CameraPicker: UIViewControllerRepresentable {
    /// 拍完回传 UIImage；用户取消则回 nil。
    var onPicked: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera          // 指定走相机而非相册
        picker.delegate = context.coordinator
        return picker
    }

    // 相机控制器没有需要随状态刷新的内容，留空即可。
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onPicked: onPicked) }

    /// Coordinator 充当 UIKit 的 delegate，把回调转回 SwiftUI 的闭包。
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onPicked: (UIImage?) -> Void
        init(onPicked: @escaping (UIImage?) -> Void) { self.onPicked = onPicked }

        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let image = info[.originalImage] as? UIImage
            picker.dismiss(animated: true) { self.onPicked(image) }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true) { self.onPicked(nil) }
        }
    }
}

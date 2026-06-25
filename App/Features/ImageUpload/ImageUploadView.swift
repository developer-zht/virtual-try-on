import SwiftUI
import PhotosUI

/// 上传图片页：相册上传 + 拍照上传 → 传给后端 → 把后端返回的图片回显在本页。
struct ImageUploadView: View {
    @State private var viewModel = ImageUploadViewModel()
    /// 相册选择器选中的条目（PhotosPicker 用）。
    @State private var photoItem: PhotosPickerItem?
    /// 是否弹出相机。
    @State private var showCamera = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    sourceImageSection
                    actionButtons
                    resultSection
                }
                .padding()
            }
            .navigationTitle("上传图片")
            // 相册回调：把选中的条目读成 Data → UIImage，交给 viewModel。
            .onChange(of: photoItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        viewModel.setImage(image)
                    }
                }
            }
            // 相机：全屏弹出，拍完回传 UIImage。
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { image in
                    if let image { viewModel.setImage(image) }
                }
                .ignoresSafeArea()
            }
        }
    }

    // MARK: - 原图预览

    @ViewBuilder
    private var sourceImageSection: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.secondarySystemBackground))
            if let image = viewModel.localImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.largeTitle)
                    Text("还没选择图片")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(height: 280)
    }

    // MARK: - 两个上传入口

    private var actionButtons: some View {
        HStack(spacing: 12) {
            // 相册：iOS 16+ 原生 PhotosPicker，无需相册权限弹窗。
            PhotosPicker(selection: $photoItem, matching: .images) {
                Label("相册上传", systemImage: "photo")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)

            // 拍照：模拟器没相机会自动置灰。
            Button {
                showCamera = true
            } label: {
                Label("拍照上传", systemImage: "camera")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(!UIImagePickerController.isSourceTypeAvailable(.camera))
        }
    }

    // MARK: - 上传按钮 + 状态 + 结果回显

    @ViewBuilder
    private var resultSection: some View {
        switch viewModel.phase {
        case .idle:
            EmptyView()

        case .picked, .failed:
            Button {
                Task { await viewModel.upload() }
            } label: {
                Text("上传到后端")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)

            if case .failed(let message) = viewModel.phase {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

        case .uploading:
            ProgressView("上传中…")
                .padding()

        case .done:
            VStack(spacing: 12) {
                Text("后端返回结果")
                    .font(.headline)
                if let url = viewModel.resultImageURL {
                    // AsyncImage 负责下载并显示远程图片，自带加载/失败态。
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable()
                                .scaledToFit()
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        case .failure:
                            Text("结果图加载失败").foregroundStyle(.secondary)
                        case .empty:
                            ProgressView()
                        @unknown default:
                            EmptyView()
                        }
                    }
                }
                Button("重新上传") {
                    Task { await viewModel.upload() }
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

#Preview {
    ImageUploadView()
}

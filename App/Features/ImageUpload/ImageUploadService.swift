import Foundation

// 「把一张图片上传给后端，拿回一张结果图」这件事的数据契约 + 服务抽象。
// 思路对齐 AIKit 的 Provider：UI 只认协议，不关心背后是真 HTTP 还是假数据，
// 这样后端接口没就绪也能先把页面完整跑起来。

// MARK: - 数据契约

/// 后端处理完返回的结果。
/// 现在只关心「结果图地址」；以后后端多回字段（如耗时、任务 id），往这里加即可，UI 不必大改。
struct UploadResult: Sendable, Equatable {
    /// 后端处理后返回的图片 URL（要回显到页面上的那张）。
    var resultImageURL: URL
}

/// 上传过程可能出现的错误。分类清楚，UI 才好给出人话提示。
enum UploadError: Error, Equatable {
    case invalidResponse        // 不是 HTTPURLResponse
    case http(status: Int)      // 非 2xx
    case decoding(String)       // 返回 JSON 解析失败
}

// MARK: - 服务抽象（统一插座）

/// 上传服务协议。换实现（假→真）时，注入这里换一个类型即可，UI 一行不用动。
protocol ImageUploadService: Sendable {
    /// 上传图片二进制，返回结果。
    /// - Parameters:
    ///   - imageData: 图片字节（JPEG/PNG 都行）。
    ///   - mime: 对应的 MIME，如 "image/jpeg"。
    func upload(imageData: Data, mime: String) async throws -> UploadResult
}

// MARK: - 假接口（占位用）

/// 占位实现：模拟 1.5s 网络延迟，然后回一张随机图。
/// 后端就绪后，把注入处换成 `HTTPImageUploadService` 即可。
struct MockImageUploadService: ImageUploadService {
    func upload(imageData: Data, mime: String) async throws -> UploadResult {
        try await Task.sleep(nanoseconds: 1_500_000_000) // 假装在传输

        // 用图片大小当随机种子，保证每次选不同图片，回显也不同，便于肉眼确认链路通了。
        let seed = imageData.count % 1000
        guard let url = URL(string: "https://picsum.photos/seed/\(seed)/800/1000") else {
            throw UploadError.decoding("占位 URL 拼接失败")
        }
        return UploadResult(resultImageURL: url)
    }
}

// MARK: - 真·HTTP 实现（multipart/form-data）

/// 真后端实现。后端给到「端点 / 字段名 / 返回结构」后，核对下面 3 处 TODO 即可启用。
struct HTTPImageUploadService: ImageUploadService {
    /// 上传端点，例如 https://api.styletwin.app/v1/tryon
    let endpoint: URL
    /// 表单里图片字段名，跟后端约定（常见是 "file" 或 "image"）。
    let fieldName: String
    private let session: URLSession

    init(endpoint: URL, fieldName: String = "file", session: URLSession = .shared) {
        self.endpoint = endpoint
        self.fieldName = fieldName
        self.session = session
    }

    func upload(imageData: Data, mime: String) async throws -> UploadResult {
        let boundary = "Boundary-\(UUID().uuidString)"

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        // multipart 上传必须声明 boundary，让后端知道各段的分隔符。
        request.setValue("multipart/form-data; boundary=\(boundary)",
                         forHTTPHeaderField: "Content-Type")
        request.httpBody = makeMultipartBody(imageData: imageData, mime: mime, boundary: boundary)

        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw UploadError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw UploadError.http(status: http.statusCode)
        }

        // TODO①：返回结构。这里假设后端回 { "imageUrl": "https://..." }，按真实文档改 DTO。
        let dto: UploadResponseDTO
        do {
            dto = try JSONDecoder().decode(UploadResponseDTO.self, from: data)
        } catch {
            throw UploadError.decoding(error.localizedDescription)
        }
        guard let url = URL(string: dto.imageUrl) else {
            throw UploadError.decoding("imageUrl 不是合法 URL")
        }
        return UploadResult(resultImageURL: url)
    }

    /// 手工拼一个 multipart/form-data 请求体（只含一张图片字段）。
    private func makeMultipartBody(imageData: Data, mime: String, boundary: String) -> Data {
        let ext = mime.hasSuffix("png") ? "png" : "jpg"
        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"upload.\(ext)\"\r\n")
        body.append("Content-Type: \(mime)\r\n\r\n")
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n")
        return body
    }
}

// TODO②：字段名要跟后端文档对齐（这里假设是 imageUrl）。
private struct UploadResponseDTO: Decodable {
    let imageUrl: String
}

private extension Data {
    /// 往 Data 里追加一段 UTF-8 字符串，拼 multipart 时用。
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) { append(data) }
    }
}

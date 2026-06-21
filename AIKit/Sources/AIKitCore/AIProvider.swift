import Foundation

/// 一个「AI 模型管道」的统一插座。
///
/// 上层（`ChatSession` / UI）只认这个协议，不关心背后是
/// 「走自家后端代理」还是「端上直连模型厂商」——见约定 §4。
/// 因此 `BackendProxyProvider`（StyleTwin）与 `DirectProvider`（CFD）
/// 都是它的实现之一，上层代码完全不用改。
public protocol AIProvider: Sendable {

    /// 一次性补全：发出请求，等全部结果回来。
    func complete(_ request: AIRequest) async throws -> AIResponse

    /// 流式补全：结果像打字机一样一段段吐出来（约定 §2 强需求）。
    func stream(_ request: AIRequest) -> AsyncThrowingStream<AIChunk, Error>
}

public extension AIProvider {

    /// 默认实现：只实现了 `complete` 的 Provider，可借此「伪流式」一次吐出，
    /// 保证 `ChatSession` 的流式代码路径对**所有** Provider 都成立。
    /// 真正支持原生流的 Provider 应自行 override `stream(_:)`。
    func stream(_ request: AIRequest) -> AsyncThrowingStream<AIChunk, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let response = try await complete(request)
                    continuation.yield(AIChunk(textDelta: response.text, isFinal: true))
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

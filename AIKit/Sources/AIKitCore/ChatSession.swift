import Foundation
import Observation

/// 多轮聊天的状态机（约定 §2）。
///
/// 用法：UI **只读** `messages` / `streamingText` / `state`，通过 `send(_:)` 驱动。
/// 设计为「多轮」，StyleTwin 的单轮点评是它的退化用法（约定 §4）。
/// 它只认 `AIProvider` 协议，不知道背后是后端代理还是端上直连。
@MainActor
@Observable
public final class ChatSession {

    /// 已成交的对话历史（user / assistant 交替）。
    public private(set) var messages: [AIMessage] = []
    /// 正在流入的助手消息（边收边显，收完并入 messages）。
    public private(set) var streamingText: String = ""
    /// 当前状态，供 UI 决定加载态 / 重试按钮等。
    public private(set) var state: ChatState = .idle

    private let provider: AIProvider
    private let system: String?
    private var currentTask: Task<Void, Never>?
    private var lastAttachments: [AIAttachment] = []

    public init(provider: AIProvider, system: String? = nil) {
        self.provider = provider
        self.system = system
    }

    /// 发送一条用户消息，并以流式接收助手回复。
    public func send(_ text: String, attachments: [AIAttachment] = []) async {
        guard state != .sending, state != .streaming else { return }
        messages.append(AIMessage(role: .user, text: text))
        lastAttachments = attachments
        await runStream(attachments: attachments)
    }

    /// 失败后重试上一轮（约定 §1 网络韧性）。
    public func retryLast() async {
        guard state.isFailed, messages.last?.role == .user else { return }
        await runStream(attachments: lastAttachments)
    }

    /// 取消正在进行的流式请求。
    public func cancel() {
        currentTask?.cancel()
        currentTask = nil
        streamingText = ""
        state = .idle
    }

    // MARK: - 私有：流水机

    private func runStream(attachments: [AIAttachment]) async {
        state = .sending
        streamingText = ""
        let request = AIRequest(system: system, messages: messages, attachments: attachments)
        let stream = provider.stream(request)

        let task = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                for try await chunk in stream {
                    if Task.isCancelled { break }
                    self.state = .streaming
                    self.streamingText += chunk.textDelta
                }
                self.commitAssistantMessage()
            } catch is CancellationError {
                self.resetAfterCancel()
            } catch {
                self.state = .failed(error.localizedDescription)
                self.streamingText = ""
                self.currentTask = nil
            }
        }
        currentTask = task
        await task.value
    }

    private func commitAssistantMessage() {
        if !streamingText.isEmpty {
            messages.append(AIMessage(role: .assistant, text: streamingText))
        }
        streamingText = ""
        state = .idle
        currentTask = nil
    }

    private func resetAfterCancel() {
        streamingText = ""
        state = .idle
        currentTask = nil
    }
}

/// 聊天状态。`.failed` 带一条人类可读的原因，便于 UI 直接显示。
public enum ChatState: Sendable, Equatable {
    case idle
    case sending
    case streaming
    case failed(String)

    public var isFailed: Bool {
        if case .failed = self { return true }
        return false
    }
}

import Foundation

// 一次 AI 调用的输入/输出值类型。零业务、可 Sendable、可跨 actor 传递。
// 两个 App 都「喂」同一个 AIRequest（约定 §3）。

// MARK: - 输入

/// 一次提问的「信封」。
public struct AIRequest: Sendable {
    /// system prompt（角色设定 / 规则）。
    public var system: String?
    /// 多轮历史 + 当前问题。
    public var messages: [AIMessage]
    /// ★多模态：图片等附件。从第一天就留好；纯文字场景（CFD）传空数组。★
    public var attachments: [AIAttachment]
    /// 模型/温度/最大 token 等可调项。
    public var options: AIOptions

    public init(system: String? = nil,
                messages: [AIMessage] = [],
                attachments: [AIAttachment] = [],
                options: AIOptions = AIOptions()) {
        self.system = system
        self.messages = messages
        self.attachments = attachments
        self.options = options
    }
}

/// 一条对话消息。
public struct AIMessage: Sendable, Equatable {
    public enum Role: Sendable, Equatable { case user, assistant }
    public var role: Role
    public var text: String

    public init(role: Role, text: String) {
        self.role = role
        self.text = text
    }
}

/// 多模态附件。目前只有图片；用 enum 方便以后扩展（音频 / 文件 …）。
public enum AIAttachment: Sendable, Equatable {
    case image(Data, mime: String)
}

/// 模型可调项。
public struct AIOptions: Sendable {
    public var model: String?
    public var temperature: Double?
    public var maxTokens: Int?

    public init(model: String? = nil, temperature: Double? = nil, maxTokens: Int? = nil) {
        self.model = model
        self.temperature = temperature
        self.maxTokens = maxTokens
    }
}

// MARK: - 输出

/// 流式输出的一小段（一个「打字机增量」）。
public struct AIChunk: Sendable, Equatable {
    public var textDelta: String
    public var isFinal: Bool

    public init(textDelta: String, isFinal: Bool = false) {
        self.textDelta = textDelta
        self.isFinal = isFinal
    }
}

/// 一次性补全的完整结果。
public struct AIResponse: Sendable, Equatable {
    public var text: String
    public var usage: AIUsage?

    public init(text: String, usage: AIUsage? = nil) {
        self.text = text
        self.usage = usage
    }
}

/// 用量（成本计量 —— StyleTwin NFR-5 / 约定 D-F）。
public struct AIUsage: Sendable, Equatable {
    public var inputTokens: Int
    public var outputTokens: Int

    public init(inputTokens: Int, outputTokens: Int) {
        self.inputTokens = inputTokens
        self.outputTokens = outputTokens
    }
}

// MARK: - 错误

/// 共享层常见错误形状。
/// 「哪些可重试 / 如何退避 / 降级到什么」是 D-D 决策，这里只先给分类，
/// 方便 Provider 抛出、上层识别。
public enum AIError: Error, Sendable, Equatable {
    case network(String)                // 连接失败 / 超时（通常可重试）
    case http(status: Int)              // 非 2xx
    case decoding(String)               // 解析模型响应失败
    case cancelled                      // 用户取消
    case providerUnavailable(String)    // 离线 / 未配置（CFD 离线优先要用）
}

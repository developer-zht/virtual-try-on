import Foundation

/// 发数据给 AI 前的「同意 / 披露」信息（约定 §1 / §2）。
///
/// **机制共享、文案各 App 注入**：
/// - StyleTwin：scopeText = 「你的人像照片将发送给 AI 服务」（FR-11 / NFR-3）。
/// - CFD：scopeText = 「你的提问与所引代码将发送给 AI 服务」（UC7-E3）。
public struct AIConsent: Sendable, Equatable {
    /// 将要发送的数据范围（给用户看的明确说明）。
    public var scopeText: String
    /// 接收方（Provider 名）。
    public var providerName: String
    /// 保留多久 / 是否用于训练。
    public var retentionNote: String

    public init(scopeText: String, providerName: String, retentionNote: String) {
        self.scopeText = scopeText
        self.providerName = providerName
        self.retentionNote = retentionNote
    }
}

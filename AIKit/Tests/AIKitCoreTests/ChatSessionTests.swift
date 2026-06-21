import XCTest
@testable import AIKitCore

/// 一个假的 Provider：把固定文字拆成几段「流式」吐出，用来验证 ChatSession 的流水机。
private struct MockStreamingProvider: AIProvider {
    let parts: [String]

    func complete(_ request: AIRequest) async throws -> AIResponse {
        AIResponse(text: parts.joined())
    }

    func stream(_ request: AIRequest) -> AsyncThrowingStream<AIChunk, Error> {
        AsyncThrowingStream { continuation in
            for (i, p) in parts.enumerated() {
                continuation.yield(AIChunk(textDelta: p, isFinal: i == parts.count - 1))
            }
            continuation.finish()
        }
    }
}

/// 只实现 complete 的 Provider —— 用来验证「伪流式」默认实现也能工作。
private struct CompleteOnlyProvider: AIProvider {
    func complete(_ request: AIRequest) async throws -> AIResponse {
        AIResponse(text: "OK")
    }
}

final class ChatSessionTests: XCTestCase {

    @MainActor
    func testStreamingAccumulatesAssistantMessage() async {
        let provider = MockStreamingProvider(parts: ["你", "这身", "搭配很协调"])
        let session = ChatSession(provider: provider, system: "你是穿搭顾问")

        await session.send("帮我看看这套")

        XCTAssertEqual(session.messages.count, 2)              // user + assistant
        XCTAssertEqual(session.messages[0].role, .user)
        XCTAssertEqual(session.messages[1].role, .assistant)
        XCTAssertEqual(session.messages[1].text, "你这身搭配很协调")
        XCTAssertEqual(session.state, .idle)
        XCTAssertTrue(session.streamingText.isEmpty)
    }

    @MainActor
    func testPseudoStreamFromCompleteOnlyProvider() async {
        let session = ChatSession(provider: CompleteOnlyProvider())
        await session.send("hi")
        XCTAssertEqual(session.messages.last?.text, "OK")
        XCTAssertEqual(session.state, .idle)
    }

    @MainActor
    func testMultiTurnKeepsHistory() async {
        let session = ChatSession(provider: MockStreamingProvider(parts: ["好的"]))
        await session.send("第一句")
        await session.send("第二句")
        XCTAssertEqual(session.messages.count, 4)             // 2 轮 = 2 user + 2 assistant
        XCTAssertEqual(session.messages.map(\.role), [.user, .assistant, .user, .assistant])
    }
}

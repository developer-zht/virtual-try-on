import XCTest
@testable import FitTwinCore

/// 换装互斥规则单测（§5.10 / FR-5；NFR-6 要求换装互斥须有单测）。
final class WardrobeRulesTests: XCTestCase {

    func testSameSlotIsMutuallyExclusive() {
        // 已穿上装，再穿上装 → 先脱原上装。
        let remove = WardrobeRules.slotsToRemove(equipping: .top, whenEquipped: [.top, .bottom])
        XCTAssertEqual(remove, [.top])
    }

    func testFullbodyClearsTopAndBottom() {
        // 穿连衣裙 → 清空上 + 下装；鞋不动。
        let remove = WardrobeRules.slotsToRemove(equipping: .fullbody, whenEquipped: [.top, .bottom, .shoes])
        XCTAssertEqual(remove, [.top, .bottom])
    }

    func testTopClearsFullbody() {
        // 已穿连衣裙，再穿上装 → 脱连衣裙。
        let remove = WardrobeRules.slotsToRemove(equipping: .top, whenEquipped: [.fullbody])
        XCTAssertEqual(remove, [.fullbody])
    }

    func testIndependentSlotsDoNotConflict() {
        // 鞋是独立槽位，穿鞋不影响上/下装。
        let remove = WardrobeRules.slotsToRemove(equipping: .shoes, whenEquipped: [.top, .bottom])
        XCTAssertTrue(remove.isEmpty)
    }

    func testOuterwearStacksOverTop() {
        // 外套叠在上装之上，不互斥。
        let remove = WardrobeRules.slotsToRemove(equipping: .outerwear, whenEquipped: [.top, .bottom])
        XCTAssertTrue(remove.isEmpty)
    }
}

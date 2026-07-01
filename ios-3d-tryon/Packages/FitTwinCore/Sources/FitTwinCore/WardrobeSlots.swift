import Foundation

/// 部位/槽位模型（SRS §5.10）。每件衣服在 manifest 声明所属 `slot`。
public enum GarmentSlot: String, Sendable, CaseIterable, Codable, Equatable {
    case top         // 上装
    case bottom      // 下装
    case outerwear   // 外套
    case fullbody    // 连体 / 连衣裙
    case shoes       // 鞋
    case accessory   // 配饰
}

/// 换装互斥规则（FR-5 / §5.10）。纯逻辑、确定性、可单测（NFR-6：换装互斥须单测）。
public enum WardrobeRules {

    /// 给定「已穿槽位集合」与「要穿的新槽位」，返回因互斥需要**先脱掉**的槽位集合。
    ///
    /// 规则（§5.10）：
    ///  • 同槽位互斥：换上装替换原上装。
    ///  • `fullbody` 与 `top`+`bottom` 互斥：穿连衣裙清空上/下装；反之穿上/下装清空连衣裙。
    ///  • `outerwear` / `shoes` / `accessory` 独立，不与他者互斥（outerwear 叠在 top 之上）。
    public static func slotsToRemove(equipping new: GarmentSlot,
                                     whenEquipped equipped: Set<GarmentSlot>) -> Set<GarmentSlot> {
        var remove: Set<GarmentSlot> = []

        // 同槽位互斥
        if equipped.contains(new) { remove.insert(new) }

        switch new {
        case .fullbody:
            remove.formUnion(equipped.intersection([.top, .bottom]))
        case .top, .bottom:
            if equipped.contains(.fullbody) { remove.insert(.fullbody) }
        case .outerwear, .shoes, .accessory:
            break // 独立槽位，无额外互斥
        }
        return remove
    }
}

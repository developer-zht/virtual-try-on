import SwiftUI
import RealityKit

/// RISK-10 spike 的相机控制器：透视相机 ⇄ 正交相机切换 + 「遮罩式瞬切」过渡。
///
/// 为什么这么设计（大白话）：
///  • **正交 vs 透视是两种投影**，数学上**不能线性补间**——硬切会「啪」地一下很突兀。
///  • 解法：在**同一台相机实体**上换组件（`PerspectiveCameraComponent` ⇄
///    `OrthographicCameraComponent`），并在切换的**中点瞬切**，外面盖一层 SwiftUI 短淡化 +
///    轻微缩放把这一下「藏」住——看起来就顺了。手感（时长/深浅）在这里调。
///  • 为什么测量要用正交：只有正交下「屏幕像素 ↔ 真实厘米」是**固定比例**，标尺才准；
///    放大 = 缩小正交可视范围 → 刻度变细、读数更精确（FR-1）。
///
/// ⚠️ 真机核对点（RISK-10 的核心）：`OrthographicCameraComponent` 在 iOS 18 真机是否可用、
///    能否渲染出无透视的正交视图。文档：
///    https://developer.apple.com/documentation/realitykit/orthographiccameracomponent
@MainActor
@Observable
final class ProjectionController {

    /// 锁视角（测量 / 正交） vs 解锁（展示 / 透视）。
    private(set) var isLocked = false

    /// 正交可视高度（世界米）：越小越「放大」，刻度越细（= 正交相机 `scale`）。
    private(set) var orthoScale: Float = 1.9

    /// 透视相机到目标的距离（解锁态用）。
    var perspectiveDistance: Float = 2.6

    /// 「遮罩式瞬切」开关：切换瞬间置 true，View 据此盖一层短淡化 + 轻微缩放。
    var isMasking = false

    /// 相机看向的目标点（模特大致胸口高度）。
    let target: SIMD3<Float> = [0, 0.9, 0]

    /// 唯一的相机实体；切换 = 换它身上的相机组件。
    let cameraEntity = Entity()

    /// 把相机装好（在 RealityView 的 make 闭包里调一次）。
    func install() {
        applyCamera()
    }

    /// 锁/解锁切换：遮罩淡入 → 中点瞬切相机 → 遮罩淡出（手感在此调）。
    func toggleLock() async {
        withAnimation(.easeInOut(duration: 0.14)) { isMasking = true }
        try? await Task.sleep(for: .milliseconds(140))   // 让遮罩盖上来
        isLocked.toggle()
        applyCamera()                                    // ★ 中点瞬切（投影类型突变被遮罩藏住）
        withAnimation(.easeInOut(duration: 0.16)) { isMasking = false }
    }

    /// 正交态缩放（FR-1：放大 = 缩小可视范围 → 刻度更细）。解锁态忽略。
    func zoom(by factor: Float) {
        guard isLocked else { return }
        orthoScale = max(0.4, min(3.0, orthoScale * factor))
        applyCamera()
    }

    // MARK: - 真机核对触点

    /// 按当前状态给相机实体装上对应的相机组件，并摆好正面位姿。
    private func applyCamera() {
        cameraEntity.components.remove(PerspectiveCameraComponent.self)
        cameraEntity.components.remove(OrthographicCameraComponent.self)

        if isLocked {
            // 正交：固定正面、旋转锁定（旋转由 View 那边禁掉）。
            var ortho = OrthographicCameraComponent()
            ortho.scale = orthoScale
            cameraEntity.components.set(ortho)
            cameraEntity.position = [target.x, target.y, 2.0]
        } else {
            // 透视：自由旋转/缩放的展示态。
            cameraEntity.components.set(PerspectiveCameraComponent())
            cameraEntity.position = [target.x, target.y, perspectiveDistance]
        }
        cameraEntity.look(at: target, from: cameraEntity.position, relativeTo: nil)
    }
}

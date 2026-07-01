import SwiftUI

/// 正交态叠加的**矢量标尺**（SwiftUI `Canvas`/`Path`），FR-1。
///
/// 关键点：
///  • 用矢量画（不是位图）——所以**放大后依旧锐利**。
///  • 刻度间隔随缩放**重算**（zoom-aware）：放大 → 每米占的像素变多 → 自动选更细的刻度。
///  • 仅在正交态有意义：正交下「屏幕点 ↔ 真实米」是固定比例 `pointsPerMeter`。
///
/// 本 spike 把标尺锚在视图竖直中线（= 0），向上下标厘米偏移，足以验证
/// 「刻度线性正确、缩放后更细且清晰」。正式 App 里会把 0 对到模特脚底并显示绝对身高。
struct RulerOverlay: View {

    /// 每米对应多少屏幕点（point）。由正交可视高度 + 视图高度算出。
    let pointsPerMeter: CGFloat

    /// 候选刻度间隔（米）：5mm / 1 / 2 / 5 / 10 / 20 / 50cm / 1m。
    private static let stepsMeters: [CGFloat] = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0]

    var body: some View {
        Canvas { ctx, size in
            guard pointsPerMeter.isFinite, pointsPerMeter > 0 else { return }

            let step = Self.niceStep(targetPx: 56, pointsPerMeter: pointsPerMeter)
            let stepPx = step * pointsPerMeter
            let midY = size.height / 2
            let leftX: CGFloat = 30

            // 主轴竖线
            var axis = Path()
            axis.move(to: CGPoint(x: leftX, y: 0))
            axis.addLine(to: CGPoint(x: leftX, y: size.height))
            ctx.stroke(axis, with: .color(.primary.opacity(0.5)), lineWidth: 1)

            // 从中心向上下画刻度，每 5 格一根主刻度（带读数）
            var i = 0
            while CGFloat(i) * stepPx <= midY + stepPx {
                for sign in [CGFloat(1), CGFloat(-1)] where !(i == 0 && sign < 0) {
                    let y = midY - sign * CGFloat(i) * stepPx
                    guard y >= -1, y <= size.height + 1 else { continue }

                    let isMajor = (i % 5 == 0)
                    let tickLen: CGFloat = isMajor ? 16 : 8
                    var tick = Path()
                    tick.move(to: CGPoint(x: leftX, y: y))
                    tick.addLine(to: CGPoint(x: leftX + tickLen, y: y))
                    ctx.stroke(tick,
                               with: .color(.primary.opacity(isMajor ? 0.9 : 0.4)),
                               lineWidth: isMajor ? 1.5 : 1)

                    if isMajor && i != 0 {
                        let cm = sign * CGFloat(i) * step * 100
                        let text = Text(Self.cmLabel(cm))
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(.primary.opacity(0.85))
                        ctx.draw(text, at: CGPoint(x: leftX + tickLen + 14, y: y), anchor: .center)
                    }
                }
                i += 1
            }

            // 图例：当前刻度间隔（缩放时会看到它变细）
            let legend = Text("刻度 \(Self.stepLabel(step)) · \(Int(pointsPerMeter)) pt/m")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            ctx.draw(legend, at: CGPoint(x: leftX + 4, y: 16), anchor: .leading)
        }
        .allowsHitTesting(false)
    }

    // MARK: - 刻度选择（zoom-aware）

    /// 选「最细但相邻主距 ≥ targetPx」的刻度间隔。放大 → pointsPerMeter↑ → 选到更细的 step。
    private static func niceStep(targetPx: CGFloat, pointsPerMeter: CGFloat) -> CGFloat {
        for s in stepsMeters where s * pointsPerMeter >= targetPx { return s }
        return stepsMeters.last!
    }

    private static func stepLabel(_ step: CGFloat) -> String {
        if step >= 1 { return "\(Int(step))m" }
        if step >= 0.01 { return "\(Int(step * 100))cm" }
        return "\(Int(step * 1000))mm"
    }

    private static func cmLabel(_ cm: CGFloat) -> String {
        let rounded = (cm * 10).rounded() / 10   // 0.1cm 精度
        return rounded == rounded.rounded()
            ? "\(Int(rounded))"
            : String(format: "%.1f", Double(rounded))
    }
}

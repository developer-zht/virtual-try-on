import SwiftUI
import RealityKit
import FitTwinCore

/// 捏人屏：RealityView 展示模特 + 底部折叠滑块面板。
///
/// 验收（kickoff ②）：真机拖滑块，身体与在穿衣服**一起形变、无明显穿模**（Spike B/C）。
struct SculptScreen: View {

    @State private var model = SculptViewModel()

    var body: some View {
        ZStack(alignment: .bottom) {
            RealityView { content in
                if let root = await model.makeContent() {
                    content.add(root)
                }
                content.add(Self.keyLight())
            }
            .ignoresSafeArea()

            SculptPanel(weights: $model.weights, onChange: model.applyWeights, onReset: model.reset)
                .padding()
        }
        .overlay(alignment: .top) {
            if let note = model.statusNote {
                Text(note)
                    .font(.footnote)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.top, 8)
                    .multilineTextAlignment(.center)
            }
        }
    }

    /// 一盏方向光，免得模型黑乎乎（最小可视）。
    private static func keyLight() -> Entity {
        let light = DirectionalLight()
        light.light.intensity = 4000
        light.look(at: [0, 0, 0], from: [1, 2, 2], relativeTo: nil)
        return light
    }
}

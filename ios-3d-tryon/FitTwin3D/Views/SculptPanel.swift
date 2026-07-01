import SwiftUI
import FitTwinCore

/// 折叠面板滑块（FR-1）。
///
/// 结构按 §5.2 的 8~10 通道**全量预留**并按 `group` 折叠分组；每个滑块写入 `weights` 字典。
/// 占位资产目前只带 `k_weight` 一个通道——其余滑块照样在，只是占位资产上看不到形变
/// （引擎对资产没有的通道自动忽略）；待正式资产带齐通道后，所有滑块即刻生效。
struct SculptPanel: View {

    @Binding var weights: [String: Float]
    var onChange: () -> Void
    var onReset: () -> Void

    /// 按出现顺序去重的分组名。
    private var groups: [String] {
        var seen: [String] = []
        for def in BodyChannel.catalog where !seen.contains(def.group) {
            seen.append(def.group)
        }
        return seen
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("捏身材").font(.headline)
                Spacer()
                Button("复位", action: onReset).font(.subheadline)
            }
            .padding(.horizontal).padding(.top, 12).padding(.bottom, 4)

            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(groups, id: \.self) { group in
                        DisclosureGroup(group) {
                            ForEach(BodyChannel.catalog.filter { $0.group == group }) { def in
                                sliderRow(def)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 12)
            }
            .frame(maxHeight: 300)
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private func sliderRow(_ def: BodyChannel.Definition) -> some View {
        let binding = Binding<Float>(
            get: { weights[def.id] ?? def.defaultWeight },
            set: { weights[def.id] = $0; onChange() }
        )
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(def.displayName).font(.subheadline)
                if def.kind == .girth {
                    Text("围度").font(.caption2)
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(.secondary.opacity(0.15), in: Capsule())
                }
                Spacer()
                Text(String(format: "%.2f", binding.wrappedValue))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            Slider(value: binding, in: def.range.lowerBound...def.range.upperBound)
        }
        .padding(.vertical, 2)
    }
}

import SwiftUI
import SwiftData
import FitTwinCore

/// §7.2 SwiftData 自检屏：建 / 存 / 取 `BodyModel`（kickoff ② 验收）。
///
/// 这屏故意做得直白——一个按钮新建中性身材的 BodyModel，列表用 `@Query` 实时取出。
/// 能看到计数增长、退出重进仍在，即证明 ModelContainer 与 §7.2 实体接通了。
struct PersistenceSmokeScreen: View {

    @Environment(\.modelContext) private var context
    @Query(sort: \BodyModel.updatedAt, order: .reverse) private var bodies: [BodyModel]

    var body: some View {
        NavigationStack {
            List {
                Section("§7.2 SwiftData 自检") {
                    Button {
                        addBody()
                    } label: {
                        Label("新建一个 BodyModel（中性身材）", systemImage: "plus.circle")
                    }
                    Text("已存 \(bodies.count) 个模特状态")
                        .foregroundStyle(.secondary)
                }

                Section("已存模特") {
                    if bodies.isEmpty {
                        Text("还没有模特——点上面的按钮建一个。")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(bodies) { body in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(body.name).font(.headline)
                            Text("source=\(body.source) · 通道数=\(body.channelWeights.count) · baseBody=\(body.baseBodyId)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .onDelete(perform: delete)
                }
            }
            .navigationTitle("存档")
            .toolbar { EditButton() }
        }
    }

    private func addBody() {
        let body = BodyModel(
            name: "模特 \(bodies.count + 1)",
            isDefault: bodies.isEmpty,
            source: "manual",
            baseBodyId: "body_female_a",
            channelWeights: BodyChannel.neutralWeights
        )
        context.insert(body)
        try? context.save()
    }

    private func delete(_ offsets: IndexSet) {
        for index in offsets { context.delete(bodies[index]) }
        try? context.save()
    }
}

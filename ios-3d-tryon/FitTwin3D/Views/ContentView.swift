import SwiftUI

/// App 根视图。两个 Tab 直接对应 kickoff ② 的两条验收：
///  • 「捏人」：RealityView 拖滑块 → 身体+衣服一起形变（复现 Spike B/C）。
///  • 「存档」：SwiftData 建/存/取 BodyModel（§7.2 自检）。
struct ContentView: View {
    var body: some View {
        TabView {
            SculptScreen()
                .tabItem { Label("捏人", systemImage: "slider.horizontal.3") }
            PersistenceSmokeScreen()
                .tabItem { Label("存档", systemImage: "tray.full") }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [BodyModel.self], inMemory: true)
}

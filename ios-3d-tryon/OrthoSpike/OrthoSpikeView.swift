import SwiftUI
import RealityKit

/// ① RISK-10 spike 主视图：透视自由旋转 ⇄ 正交测量（标尺）的「锁视角」切换。
///
/// 验收（kickoff ①）：真机上锁/解锁切换顺滑无突兀；正交态标尺刻度线性正确、缩放后更细且清晰。
struct OrthoSpikeView: View {

    @State private var controller = ProjectionController()
    @State private var rootYaw: Double = 0          // 模特绕竖直轴的偏航角（度）
    @State private var modelRoot = Entity()         // 承载场景，旋转作用在它身上

    var body: some View {
        GeometryReader { geo in
            ZStack {
                RealityView { content in
                    // 相机（spike 的主角）
                    content.add(controller.cameraEntity)
                    controller.install()

                    // 场景：优先 scene.usdz；没有就用白方块急救（≈1.7m 高，给标尺一个可量目标）
                    let scene = (try? await Entity(named: "scene", in: .main)) ?? Self.fallbackBody()
                    modelRoot.addChild(scene)
                    content.add(modelRoot)

                    // 一盏方向光
                    content.add(Self.keyLight())
                }
                .gesture(orbitGesture)
                // 遮罩式过渡的轻微缩放（连同下面的淡化一起把投影突变藏住）
                .scaleEffect(controller.isMasking ? 0.98 : 1.0)
                .animation(.easeInOut(duration: 0.15), value: controller.isMasking)
                .ignoresSafeArea()

                // 正交态才显示标尺
                if controller.isLocked {
                    RulerOverlay(pointsPerMeter: geo.size.height / CGFloat(controller.orthoScale))
                        .transition(.opacity)
                }

                // 「遮罩式瞬切」：切换瞬间盖一层短淡化
                Color.black
                    .opacity(controller.isMasking ? 0.16 : 0)
                    .allowsHitTesting(false)
                    .ignoresSafeArea()

                controls
            }
        }
    }

    // MARK: - 控件

    private var controls: some View {
        VStack {
            HStack {
                Spacer()
                Button {
                    Task { await controller.toggleLock() }
                } label: {
                    Image(systemName: controller.isLocked ? "lock.fill" : "lock.open")
                        .font(.title2)
                        .padding(12)
                        .background(.ultraThinMaterial, in: Circle())
                }
                .padding()
            }

            Spacer()

            if controller.isLocked {
                lockedControls
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    /// 锁定（测量）态：命名视图箭头 + 缩放 + 读数。旋转锁定（orbitGesture 自动失效）。
    private var lockedControls: some View {
        VStack(spacing: 12) {
            Text(String(format: "正交可视高度 %.2f m", controller.orthoScale))
                .font(.callout.monospacedDigit())
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(.ultraThinMaterial, in: Capsule())

            HStack(spacing: 16) {
                // 命名视图循环：前/后/左/右（俯视本期留位、不做）
                namedViewButton("正面", yaw: 0)
                namedViewButton("背面", yaw: 180)
                namedViewButton("左侧", yaw: 90)
                namedViewButton("右侧", yaw: 270)
            }

            HStack(spacing: 24) {
                Button { controller.zoom(by: 1.25) } label: { Label("缩小", systemImage: "minus.magnifyingglass") }
                Button { controller.zoom(by: 0.8) } label: { Label("放大", systemImage: "plus.magnifyingglass") }
            }
            .font(.title3)
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal)
    }

    private func namedViewButton(_ title: String, yaw: Double) -> some View {
        Button(title) { snap(toYaw: yaw) }
            .font(.subheadline)
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(.secondary.opacity(0.15), in: Capsule())
    }

    // MARK: - 旋转

    /// 解锁（透视展示）态：单指拖动绕竖直轴旋转；锁定态自动失效（旋转锁定）。
    private var orbitGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                guard !controller.isLocked else { return }
                let yaw = rootYaw + Double(value.translation.width) * 0.5
                modelRoot.orientation = Self.yawQuat(yaw)
            }
            .onEnded { value in
                guard !controller.isLocked else { return }
                rootYaw = (rootYaw + Double(value.translation.width) * 0.5)
                    .truncatingRemainder(dividingBy: 360)
            }
    }

    /// 命名视图：动画旋转到指定偏航角。
    private func snap(toYaw yaw: Double) {
        rootYaw = yaw
        var t = modelRoot.transform
        t.rotation = Self.yawQuat(yaw)
        modelRoot.move(to: t, relativeTo: modelRoot.parent, duration: 0.3)
    }

    private static func yawQuat(_ degrees: Double) -> simd_quatf {
        simd_quatf(angle: Float(degrees) * .pi / 180, axis: [0, 1, 0])
    }

    // MARK: - 占位场景

    /// 白方块急救：≈1.7m 高、肩宽 0.4m 的白块，给标尺一个真实尺度的可量目标。
    private static func fallbackBody() -> Entity {
        let mesh = MeshResource.generateBox(size: [0.4, 1.7, 0.22], cornerRadius: 0.06)
        let entity = ModelEntity(mesh: mesh, materials: [SimpleMaterial(color: .white, isMetallic: false)])
        entity.position = [0, 0.9, 0]   // 站在地面、中心约在胸口
        return entity
    }

    private static func keyLight() -> Entity {
        let light = DirectionalLight()
        light.light.intensity = 5000
        light.look(at: [0, 0, 0], from: [1, 2, 2], relativeTo: nil)
        return light
    }
}

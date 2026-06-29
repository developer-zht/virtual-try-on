//
//  ContentView.swift
//  BlendShapeSpike
//
//  Created by HT Zhang  on 2026/6/27.
//

import RealityKit
import SwiftUI
import UIKit  // UIColor

struct ContentView: View {
    @State private var weight: Float = 0
    @State private var morphTargets: [Entity] = []  // 带 blendshape 的实体
    @State private var modelEntities: [Entity] = []  // 带材质(ModelComponent)的实体
    @State private var matIndex: Int = 2  // 要染色的材质槽(0/1/2 里试出衣服)
    @State private var tintRed: Bool = false  // 衣服是否染红

    var body: some View {
        VStack {
            RealityView { content in
                // 相机 + 光
                let cam = PerspectiveCamera()
                cam.look(at: [0, 0.9, 0], from: [0, 0.9, 3.0], relativeTo: nil)
                content.add(cam)
                let light = DirectionalLight()
                light.light.intensity = 3000
                light.look(at: .zero, from: [1, 2, 1.5], relativeTo: nil)
                content.add(light)

                // 加载(兼容 scene2.usdz 或 scene.usdz)
                let url =
                    Bundle.main.url(forResource: "scene2", withExtension: "usdz")
                    ?? Bundle.main.url(forResource: "scene", withExtension: "usdz")
                if let url, let root = try? await Entity(contentsOf: url) {
                    content.add(root)
                    morphTargets = collect(root) {
                        $0.components[BlendShapeWeightsComponent.self] != nil
                    }
                    modelEntities = collect(root) { $0.components[ModelComponent.self] != nil }
                    for e in modelEntities {
                        let n = e.components[ModelComponent.self]?.materials.count ?? 0
                        print("实体『\(e.name)』有 \(n) 个材质槽")  // 帮你找衣服在第几槽
                    }
                    print("blendshape 实体 \(morphTargets.count) 个")
                } else {
                    let box = ModelEntity(
                        mesh: .generateBox(size: 0.4),
                        materials: [SimpleMaterial(color: .white, isMetallic: false)])
                    box.position = [0, 0.9, 0]
                    content.add(box)
                }
            } update: { _ in
                // 1) blendshape 驱动身材
                for e in morphTargets {
                    guard var comp = e.components[BlendShapeWeightsComponent.self] else { continue }
                    for i in comp.weightSet.indices { comp.weightSet[i].weights = [weight] }
                    e.components.set(comp)
                }
                // 2) 运行时改材质 base color(这就是 E:验证 AI 纹理那条腿)
                for e in modelEntities {
                    guard var model = e.components[ModelComponent.self],
                        matIndex < model.materials.count,
                        var pbr = model.materials[matIndex] as? PhysicallyBasedMaterial
                    else { continue }
                    pbr.baseColor.tint = tintRed ? .red : .white  // 红=染色,白=还原
                    model.materials[matIndex] = pbr
                    e.components.set(model)
                }
            }

            HStack {
                Text("身材").font(.caption)
                Slider(value: $weight, in: 0...1)
            }
            .padding(.horizontal)

            HStack {
                Stepper("材质槽 \(matIndex)", value: $matIndex, in: 0...8)
                Button(tintRed ? "还原" : "把材质染红") { tintRed.toggle() }
                    .buttonStyle(.borderedProminent)
            }.padding()
        }
    }

    func collect(_ root: Entity, where match: (Entity) -> Bool) -> [Entity] {
        var result: [Entity] = []
        func walk(_ e: Entity) {
            if match(e) { result.append(e) }
            e.children.forEach(walk)
        }
        walk(root)
        return result
    }
}

#Preview {
    ContentView()
}

import XCTest
@testable import FitTwinCore

/// B-2 标定数学单测（FR-1 读数 / FR-2 反解；NFR-6 要求捏人反解须有单测）。
/// 注：断言用的是 BodyChannels 里的**占位**标定值，正式资产回填后同步更新即可。
final class MeasurementCalculatorTests: XCTestCase {

    func testNeutralMapsToMinMeters() {
        // 权重全 0（中性 B-1）→ stature = min（1.45m）。
        let m = MeasurementCalculator.measurements(for: BodyChannel.neutralWeights)
        XCTAssertEqual(m.meters("stature") ?? -1, 1.45, accuracy: 0.0001)
    }

    func testFullWeightMapsToMaxMeters() {
        let m = MeasurementCalculator.measurements(for: [BodyChannel.height: 1.0])
        XCTAssertEqual(m.meters("stature") ?? -1, 2.00, accuracy: 0.0001)
    }

    func testForwardIsLinearMidpoint() {
        let m = MeasurementCalculator.measurements(for: [BodyChannel.height: 0.5])
        XCTAssertEqual(m.meters("stature") ?? -1, 1.725, accuracy: 0.0001)
    }

    func testInverseRoundTrip() {
        // 1.725m → 权重 0.5。
        let w = MeasurementCalculator.weights(forMeasuredMeters: ["stature": 1.725])
        XCTAssertEqual(w[BodyChannel.height] ?? -1, 0.5, accuracy: 0.0001)
    }

    func testInverseNeverWritesGirthChannels() {
        // B-5：围度类（胖瘦等）即使给了米值也绝不被反解写入。
        let w = MeasurementCalculator.weights(forMeasuredMeters: ["stature": 1.7, "girth": 1.0])
        XCTAssertNotNil(w[BodyChannel.height])
        XCTAssertNil(w[BodyChannel.weight])
        XCTAssertNil(w[BodyChannel.chest])
    }

    func testInverseClampsOutOfRange() {
        // B-6：特别高/矮截断到最接近值。
        let high = MeasurementCalculator.weights(forMeasuredMeters: ["stature": 3.0])
        XCTAssertEqual(high[BodyChannel.height] ?? -1, 1.0, accuracy: 0.0001)
        let low = MeasurementCalculator.weights(forMeasuredMeters: ["stature": 1.0])
        XCTAssertEqual(low[BodyChannel.height] ?? -1, 0.0, accuracy: 0.0001)
    }
}

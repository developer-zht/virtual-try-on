# 后端接口对齐需求清单

> 基于单品分割识别 v2.0 实际输出数据，与 gRPC proto 接口协议对比分析
> 日期：2026-06-25 · 原则：不修改后端代码，仅向后端提出需求

---

## 目录

- [1. 背景](#1-背景)
- [2. 协议对齐总览](#2-协议对齐总览)
- [3. 枚举扩展需求](#3-枚举扩展需求)
- [4. SegmentItem 自由文本回退字段](#4-segmentitem-自由文本回退字段)
- [5. RenderResult 扩展建议](#5-renderresult-扩展建议)
- [6. 客户端待修复项](#6-客户端待修复项)
- [7. 优先级排序](#7-优先级排序)

---

## 1. 背景

### 1.1 数据流

```
衣品图 (jpeg) → GarmentSegmenter.segment()
    → 视觉模型 (qwen-vl-max) 识别所有单品 + 属性
    → 图像编辑模型 (qwen-image-2.0-pro) 逐件渲染白底图
    → 返回 SegmentItem[] (17 个字段)
    → gRPC/HTTP 传输给 Go 后端
```

### 1.2 对比基线

- **后端协议**：[proto/veslune/ai/v1/garment.proto](../proto/veslune/ai/v1/garment.proto) — `SegmentItem` 消息（17 个字段）
- **我们的输出**：[`garment_segmenter.py`](../ai-engine/services/garment_segmenter.py) — `to_api_items()` 方法
- **转换器**：[`converters.py`](../ai-engine/aigrpc/converters.py) — `segment_item_to_proto()` 函数

---

## 2. 协议对齐总览

### 2.1 SegmentItem 字段对比

| # | Proto 字段 | Proto 类型 | 我们的输出 | 对齐状态 |
|---|-----------|-----------|-----------|---------|
| 1 | `category` | `GarmentCategory` enum | `"DRESS"` 等字符串 | **可对齐**（已有映射） |
| 2 | `name` | `string` | `"蓝色牛仔连衣裙"` | **已对齐** |
| 3 | `sub_category` | `string` | `""` | **已对齐** |
| 4 | `primary_color` | **`Color` enum** | **`"Denim Blue"` 自由文本** | **类型不匹配** |
| 5 | `secondary_colors` | **`repeated Color` enum** | **`[]` 自由文本列表** | **类型不匹配** |
| 6 | `material` | **`Material` enum** | **`"Denim"` 自由文本** | **类型不匹配** |
| 7 | `silhouette` | `string` | `"A字"` | **已对齐** |
| 8 | `pattern` | `string` | `"Solid"` | **已对齐** |
| 9 | `pattern_detail` | `string` | `"纯色牛仔布纹理"` | **已对齐** |
| 10 | `style_tags` | **`repeated StyleTag` enum** | **`["Casual"]` 自由文本** | **类型不匹配** |
| 11 | `completeness` | `Completeness` enum | `"complete"` / `"incomplete"` | **可对齐** |
| 12 | `confidence` | `float` | `0.98` | **已对齐** |
| 13 | `reason` | `string` | `"完整"` | **已对齐** |
| 14 | `missing_parts` | `string` | `""` | **已对齐** |
| 15 | `season_suitability` | `string` | `"Summer"` | **已对齐** |
| 16 | `bbox` | `BoundingBox` message | `{x, y, width, height, description}` | **已对齐** |
| 17 | `render_result` | `RenderResult` message | `{success, method, image_urls, error}` | **method 名不匹配** |

### 2.2 关键问题：转换器遗漏

[`converters.py`](../ai-engine/aigrpc/converters.py#L115-L144) 中的 `segment_item_to_proto()` 当前**未设置** `primary_color`、`secondary_colors`、`material`、`style_tags` 这四个字段，导致 gRPC 响应中这些字段全部默认为 `0`（UNSPECIFIED），颜色/材质/风格信息完全丢失。

---

## 3. 枚举扩展需求

### 3.1 Color 枚举扩展（优先级：高）

**现状**：[common.proto](../proto/veslune/ai/v1/common.proto#L27-L48) 定义 19 种颜色，仅覆盖服装常见颜色。
**问题**：我们的模型识别非服装类单品（手机、耳环、护照等）返回的颜色超出枚举范围。

| 模型实际输出 | 当前 proto 是否支持 | 建议新增枚举值 |
|-------------|-------------------|-------------|
| `"金色"` / `"Gold"` | 无 | `COLOR_GOLD = 20` |
| `"银色"` / `"Silver"` | 无 | `COLOR_SILVER = 21` |
| `"玫瑰金"` / `"Rose Gold"` | 无 | `COLOR_ROSE_GOLD = 22` |
| `"透明"` / `"Transparent"` | 无 | `COLOR_TRANSPARENT = 23` |
| `"象牙白"` / `"Ivory"` | 无 | `COLOR_IVORY = 24` |
| `"奶油色"` / `"Cream"` | 无 | `COLOR_CREAM = 25` |
| `"炭灰"` / `"Charcoal"` | 无 | `COLOR_CHARCOAL = 26` |
| `"栗色"` / `"Maroon"` | 无 | `COLOR_MAROON = 27` |
| `"青色"` / `"Teal"` | 无 | `COLOR_TEAL = 28` |
| `"薰衣草紫"` / `"Lavender"` | 无 | `COLOR_LAVENDER = 29` |
| `"金属色"` / `"Metallic"` | 无 | `COLOR_METALLIC = 30` |
| `"薄荷绿"` / `"Mint"` | 无 | `COLOR_MINT = 31` |
| `"珊瑚色"` / `"Coral"` | 无 | `COLOR_CORAL = 32` |

### 3.2 Material 枚举扩展（优先级：高）

**现状**：[common.proto](../proto/veslune/ai/v1/common.proto#L50-L68) 仅 17 种材质，全部为服装材质。
**问题**：非服装类单品（手机、相机、耳环、护照等）返回的材质完全不在枚举中。

| 模型实际输出 | 当前 proto 是否支持 | 建议新增枚举值 |
|-------------|-------------------|-------------|
| `"Metal"` / `"金属"` | 无 | `MATERIAL_METAL = 18` |
| `"Plastic"` / `"塑料"` | 无 | `MATERIAL_PLASTIC = 19` |
| `"Canvas"` / `"帆布"` | 无 | `MATERIAL_CANVAS = 20` |
| `"Straw"` / `"草编"` | 无 | `MATERIAL_STRAW = 21` |
| `"Rubber"` / `"橡胶"` | 无 | `MATERIAL_RUBBER = 22` |
| `"Gold"` / `"金"` | 无 | `MATERIAL_GOLD = 23` |
| `"Silver"` / `"银"` | 无 | `MATERIAL_SILVER = 24` |
| `"Glass"` / `"玻璃"` | 无 | `MATERIAL_GLASS = 25` |
| `"Ceramic"` / `"陶瓷"` | 无 | `MATERIAL_CERAMIC = 26` |
| `"Carbon Fiber"` / `"碳纤维"` | 无 | `MATERIAL_CARBON_FIBER = 27` |
| `"Paper"` / `"纸"` | 无 | `MATERIAL_PAPER = 28` |
| `"Enamel"` / `"珐琅"` | 无 | `MATERIAL_ENAMEL = 29` |
| `"Wood"` / `"木材"` | 无 | `MATERIAL_WOOD = 30` |
| `"Gemstone"` / `"宝石"` | 无 | `MATERIAL_GEMSTONE = 31` |
| `"Pearl"` / `"珍珠"` | 无 | `MATERIAL_PEARL = 32` |

### 3.3 StyleTag 枚举扩展（优先级：中）

**现状**：[common.proto](../proto/veslune/ai/v1/common.proto#L71-L87) 14 个风格标签。
**问题**：模型返回的 `"Casual"`（休闲）是最高频的风格标签，但枚举中不存在。

| 模型实际输出 | 当前 proto 是否支持 | 建议新增枚举值 |
|-------------|-------------------|-------------|
| `"Casual"` / `"休闲"` | **无** | `STYLE_TAG_CASUAL = 15` |
| `"Luxury"` / `"奢华"` | 无 | `STYLE_TAG_LUXURY = 16` |
| `"Avant-Garde"` / `"前卫"` | 无 | `STYLE_TAG_AVANT_GARDE = 17` |
| `"Romantic"` / `"浪漫"` | 无 | `STYLE_TAG_ROMANTIC = 18` |
| `"Gothic"` / `"哥特"` | 无 | `STYLE_TAG_GOTHIC = 19` |
| `"Hipster"` / `"文艺"` | 无 | `STYLE_TAG_HIPSTER = 20` |
| `"Athleisure"` / `"运动休闲"` | 无 | `STYLE_TAG_ATHLEISURE = 21` |
| `"Military"` / `"军工"` | 无 | `STYLE_TAG_MILITARY = 22` |

---

## 4. SegmentItem 自由文本回退字段

### 4.1 必要性

枚举值永远无法完全覆盖 AI 模型的输出。模型可能返回任意颜色/材质名称，硬依赖枚举会导致信息丢失。建议在 `SegmentItem` 中增加自由文本回退字段。

### 4.2 建议新增字段

```protobuf
message SegmentItem {
  // ... 现有字段 1-17 ...

  // 自由文本回退字段（当枚举无法精确表达时使用）
  string primary_color_text = 18;           // e.g. "Denim Blue"
  repeated string secondary_colors_text = 19; // e.g. ["Silver Gray"]
  string material_text = 20;                // e.g. "Carbon Fiber"
  repeated string style_tags_text = 21;     // e.g. ["Casual"]
}
```

### 4.3 使用约定

客户端优先使用枚举字段，如果枚举值为 `UNSPECIFIED`（0）则回退到 `_text` 字段：

```
if primary_color != COLOR_UNSPECIFIED:
    display = primary_color  // 枚举值
else:
    display = primary_color_text  // 自由文本
```

---

## 5. RenderResult 扩展建议

### 5.1 当前 RenderResult

```protobuf
message RenderResult {
  bool success = 1;
  RenderMethod method = 2;
  repeated string image_urls = 3;
  string error_message = 4;
}
```

### 5.2 建议新增字段

```protobuf
message RenderResult {
  bool success = 1;
  RenderMethod method = 2;
  repeated string image_urls = 3;
  string error_message = 4;
  int32 processing_time_ms = 5;   // 单件渲染耗时（用于性能监控）
  int32 retry_count = 6;           // 限频重试次数（用于稳定性分析）
}
```

**理由**：
- `processing_time_ms`：单品渲染耗时差异大（完整裁剪 ~14s，局部补全 ~70s，限频重试 ~163s），后端可用于 UX 优化和超时策略
- `retry_count`：模型 API 限频时触发重试，记录重试次数有助于分析 API 稳定性

---

## 6. 客户端待修复项

以下问题可在客户端代码中直接修复，不依赖后端改动：

| 修复项 | 文件 | 说明 |
|--------|------|------|
| 渲染方法名规范化 | `garment_segmenter.py` → `to_api_items()` | 将 `"qwen_image_edit"` → `"edit_background"`，`"crop_edit_non_garment"` → `"edit_non_garment"`，`"text_to_image_with_ref"` → `"generate_with_ref"` |
| 枚举映射补全 | `converters.py` → `segment_item_to_proto()` | 增加 `primary_color`、`material`、`style_tags` 的枚举转换逻辑 |
| 新增映射表 | `converters.py` | 新增 `COLOR_TO_PROTO`、`MATERIAL_TO_PROTO`、`STYLE_TO_PROTO` 字典 |

---

## 7. 优先级排序

| 优先级 | 需求 | 影响范围 | 说明 |
|--------|------|---------|------|
| **P0** | SegmentItem 增加 `_text` 回退字段 | proto 变更 | 不增加则颜色/材质/风格信息可能完全丢失 |
| **P0** | Material 枚举扩展 | proto 变更 | 非服装类单品（手机、耳环等）材质全部丢失 |
| **P1** | Color 枚举扩展 | proto 变更 | 部分颜色（金色、银色等）无法表达 |
| **P1** | 客户端枚举映射补全 | 客户端代码 | 现有枚举能覆盖的值也未映射 |
| **P2** | StyleTag 枚举扩展 | proto 变更 | 最高频标签 "Casual" 缺失 |
| **P2** | RenderResult 扩展字段 | proto 变更 | 性能监控辅助，非阻塞 |
| **P3** | 客户端渲染方法名规范化 | 客户端代码 | 影响 RenderMethod 枚举的可读性 |

---

## 附录

### A. 相关文件

| 文件 | 说明 |
|------|------|
| [proto/veslune/ai/v1/common.proto](../proto/veslune/ai/v1/common.proto) | 枚举定义（Color, Material, StyleTag, RenderMethod） |
| [proto/veslune/ai/v1/garment.proto](../proto/veslune/ai/v1/garment.proto) | SegmentItem, RenderResult 消息定义 |
| [ai-engine/aigrpc/converters.py](../ai-engine/aigrpc/converters.py) | Proto 转换器（segment_item_to_proto） |
| [ai-engine/services/garment_segmenter.py](../ai-engine/services/garment_segmenter.py) | 单品分割服务（to_api_items 输出格式） |
| [ai-engine/rest/schemas.py](../ai-engine/rest/schemas.py) | REST API Pydantic 模型 |

### B. 参考文档

- [DEV_LOG_day1.md](DEV_LOG_day1.md) — 单品分割 v1.0 开发日志
- [DEV_LOG_day2.md](DEV_LOG_day2.md) — gRPC 协议对接 + 架构升级
- [AI_KERNEL_IMPLEMENTATION.md](AI_KERNEL_IMPLEMENTATION.md) — AI 内核实现方案

---

*文档维护：Veslune Team · 最后更新：2026-06-25*
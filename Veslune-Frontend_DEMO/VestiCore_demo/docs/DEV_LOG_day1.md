# 开发日志 — 2026-06-23

> 单品分割识别服务：品类路由优化 + 非服装类渲染修复 + 性能计时
> 版本：v1.0 · 实现语言：Python · 模型：百炼 DashScope

---

## 目录

- [1. 概述](#1-概述)
- [2. 开发进度](#2-开发进度)
- [3. 服装类单品渲染优化](#3-服装类单品渲染优化)
- [4. 非服装类单品渲染修复](#4-非服装类单品渲染修复)
- [5. Bug 修复](#5-bug-修复)
- [6. 修改文件详解](#6-修改文件详解)
- [7. 性能计时](#7-性能计时)
- [8. 测试方法](#8-测试方法)

---

## 1. 概述

### 1.1 今日目标

完善 `GarmentSegmenter` 单品分割识别服务，解决两个核心问题：

| 问题 | 现象 | 测试图 |
|------|------|--------|
| 服装类渲染错误 | 西装外套、领带被渲染成衬衫 | cloth_social.jpg |
| 非服装类渲染错误 | 手机→衬衫、护照→布料、耳环附带冗余服饰 | jeans_juess.jpg |

### 1.2 涉及模型

| 模型 | 用途 |
|------|------|
| qwen-vl-plus | 视觉分析：识别图中所有单品 + 包围盒 |
| qwen-image-2.0-pro | 图像编辑：裁剪/换白底/补全/提取 |

---

## 2. 开发进度

| 模块 | 功能 | 状态 |
|------|------|------|
| GarmentSegmenter | 视觉分析（多品类识别+包围盒） | 完成 |
| GarmentSegmenter | 服装类裁剪+编辑（完整/局部区分） | 完成 |
| GarmentSegmenter | 非服装类大件提取（_edit_non_garment） | 完成 |
| GarmentSegmenter | 非服装类小件生图（_generate_from_text_with_ref） | 完成 |
| GarmentSegmenter | 图像编辑 API 调用（限频重试） | 完成 |
| response_parser | JSON 截断修复（括号闭合顺序） | 修复 |
| garment_segmentation | 紧凑 JSON 提示词 | 优化 |

### 与 AI_KERNEL_IMPLEMENTATION.md 的对应关系

| 实现文档模块 | 今日开发对应 |
|-------------|-------------|
| 单品识别（garment_recognizer.py） | 新增 GarmentSegmenter（单品分割，比识别更进一步） |
| 图像生成（wanx2.1-t2i-turbo） | 实际使用 qwen-image-2.0-pro（图像编辑能力更强） |
| JSON 响应解析器（response_parser.py） | 括号闭合顺序修复 |
| 提示词模板（prompts/） | compact JSON 格式优化 |

---

## 3. 服装类单品渲染优化

### 3.1 问题

`_generate_from_text` 纯文本生图时，深蓝色格纹西装外套和蓝白斜纹领带被错误渲染为衬衫。

### 3.2 解决方案

修改 `_crop_garment` 增加品类路由：

- **服装类**（TOPS/BOTTOMS/SKIRT/DRESS/OUTERWEAR）：裁剪 + 图像编辑，保真原图花纹
- **非服装类**（SHOES/BAG/HEADWEAR/JEWELRY/OTHER 等）：裁剪区域过小，原图参考不可靠，改用其他策略

修改 `_edit_background` 区分完整/局部裁剪：

- **完整裁剪**：只换白底，保留原图所有细节
- **局部裁剪**（bbox < 30%）：用 JSON 所有字段构建详细描述，生成完整服装，裁剪图作为纹理参考

---

## 4. 非服装类单品渲染修复

### 4.1 问题

耳环、手机、护照、太阳镜、相机、笔记本电脑等非服装类统统走纯文本生图，模型无视觉参考导致严重错误：

| 单品 | 问题 |
|------|------|
| 金色圆环耳环 | 添加了冗余的服饰部分 |
| 粉色手机 | 生成了粉色衬衫 |
| 护照 | 生成了布料 |
| 白色太阳镜 | 混杂白色衬衫 |
| 复古相机 | 背后有灰白衣服 |
| 笔记本电脑 | 完全错误 |

### 4.2 根因分析

`_generate_from_text` 使用纯白 1024×1024 图片作为参考图，模型没有视觉锚点，只能凭文本描述"想象"目标物体，加上 qwen-image-2.0-pro 是编辑模型，倾向于在图中"添加"服装内容。

### 4.3 解决方案：按 bbox 大小分流

修改 `_crop_garment`，非服装类不再统一走文本生图，改为按 bbox 面积分流：

| bbox 面积 | 策略 | 方法 | 适用场景 |
|-----------|------|------|----------|
| > 3% | 裁剪图 + 编辑提取 | `_edit_non_garment` | 草帽、平底鞋、太阳镜、笔记本电脑 |
| ≤ 3% | 裁剪图作参考 + 强化提示词 | `_generate_from_text_with_ref` | 耳环、手机、护照、相机、手提包 |

### 4.4 新增方法

**`_edit_non_garment(image_bytes, item)`**（L432-L488）

从裁剪图中提取目标单品，去除所有服饰/布料等冗余元素。品类特定 `item_type` 识别：

```python
if "耳环" in name or "earring" in name.lower():
    item_type = "pair of earrings"
elif "手机" in name or "phone" in name.lower():
    item_type = "smartphone"
elif "护照" in name or "passport" in name.lower():
    item_type = "passport booklet"
# ... 等 12 种品类
```

编辑指令核心逻辑：
```
EXTRACT ONLY the {name} and place it on pure white background.
REMOVE ALL clothing, fabric, garments, skin, body parts.
ONLY keep the {name} itself - nothing else.
```

**`_generate_from_text_with_ref(item, size)`**（L490-L585）

用裁剪图（即使很小）代替纯白底作视觉参考，加强品类特定约束：

```python
# 手机约束
extra_constraint = "A rectangular smartphone with screen. NOT a shirt, NOT fabric, NOT clothing. It must be an electronic device."
# 护照约束
extra_constraint = "A dark blue or burgundy passport booklet with gold emblem. NOT fabric, NOT clothing. It must be a travel document."
# 耳环约束
extra_constraint = "Two matching earrings side by side. No ear, no face, no body, no clothing."
```

---

## 5. Bug 修复

### 5.1 JSON 括号闭合顺序

**文件**：[utils/response_parser.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/utils/response_parser.py#L115-L116)

**问题**：`_repair_truncated_json` 闭合括号时先闭数组再闭对象 `]}`，导致 JSON 无效。

**修复**：改为先闭对象再闭数组 `}]`（内层先关）：

```python
# 修复前
closers = "]" * open_brackets + "}" * open_braces

# 修复后
closers = "}" * open_braces + "]" * open_brackets
```

### 5.2 紧凑 JSON 提示词

**文件**：[prompts/garment_segmentation.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/garment_segmentation.py#L47-L56)

**问题**：原提示词包含 5 个格式化的多行 JSON 样例，视觉模型模仿输出导致 token 消耗过大（11 件单品输出 ~8000 tokens），被 max_tokens=8192 截断。

**修复**：
- 样例从 5 个精简为 2 个（连衣裙 + 耳环）
- 改为紧凑单行格式
- 输出格式从 `[{...}]` 改为 `{"items":[{...}]}`，兼容 `json_mode`

### 5.3 解析兼容

**文件**：[services/garment_segmenter.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/garment_segmenter.py#L110-L115)

```python
# 兼容 {"items": [...]} 和 [...] 两种格式
if isinstance(items, dict):
    if "items" in items:
        items = items["items"]
    else:
        items = [items]
```

### 5.4 限频重试增强

**文件**：[services/garment_segmenter.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/garment_segmenter.py#L613-L667)

**`_call_image_edit`** 重写：最多 4 次重试，间隔递增 10s/20s/30s/40s，同时处理 `RateQuota`、`Throttling`、`Too Many Requests` 三种限频错误。

---

## 6. 修改文件详解

### 6.1 services/garment_segmenter.py

**总体变更**：`_crop_garment` 重构 + 新增 2 个方法 + 重写 `_call_image_edit`

| 方法 | 行号 | 变更类型 | 说明 |
|------|------|----------|------|
| `segment` | L110-L115 | 修改 | 兼容 `{"items":[...]}` 格式 |
| `_crop_garment` | L148-L210 | 重构 | 按 bbox 大小分流非服装类：>3% 走编辑、≤3% 走文本生图 |
| `_edit_background` | L231-L430 | 保留 | 区分完整/局部裁剪 |
| `_edit_non_garment` | L432-L488 | **新增** | 编辑提取非服装单品（去除服饰） |
| `_generate_from_text_with_ref` | L490-L585 | **新增** | 裁剪图作参考 + 强化提示词生图 |
| `_call_image_edit` | L587-L667 | **重写** | 移除异步头、增强限频重试 |
| `_extract_images` | L669-L690 | **新增** | 提取 API 响应中的图片 URL |

### 6.2 utils/response_parser.py

| 变更 | 行号 | 说明 |
|------|------|------|
| 括号闭合顺序 | L115-L116 | `]}` → `}]`（先闭对象再闭数组） |

### 6.3 prompts/garment_segmentation.py

| 变更 | 行号 | 说明 |
|------|------|------|
| GARMENT_SEGMENT_USER | L47-L56 | 样例从 5 个→2 个，紧凑格式，`{"items":[...]}` 包装 |

---

## 7. 性能计时

**测试图**：`jeans_juess.jpg`（全身穿搭，包含连衣裙+草帽+鞋履+耳环+手机+护照+太阳镜+相机+笔记本电脑等）

**完整流程耗时**：**787 秒（13分7秒）**

| 阶段 | 耗时 | 占比 | 说明 |
|------|------|------|------|
| 视觉分析 (qwen-vl-plus) | ~80s | 10% | 3834 tokens（紧凑 JSON 生效） |
| 连衣裙渲染 | ~70s | 9% | 图像编辑 |
| 平底鞋渲染 | ~163s | 21% | 含超时重试 |
| 草帽渲染 | ~14s | 2% | 正常 |
| 其余 14 件单品渲染 | ~460s | 58% | 大量限频重试 |

**瓶颈**：qwen-image-2.0-pro 的限频控制。每次触发限频需等待 10-30s，18 件单品中约半数触发了限频。

---

## 8. 测试方法

### 8.1 测试文件位置

```
ai-engine/
├── test/
│   ├── test_file/
│   │   └── test_garment_segment.py    # 测试脚本
│   └── test_res/
│       └── 单品识别/
│           ├── cloth_social_res/      # cloth_social.jpg 结果
│           └── jeans_juess_res/       # jeans_juess.jpg 结果
```

### 8.2 测试图片位置

```
test_pic/
└── test_cloth/
    ├── cloth_social.jpg      # 西装+衬衫+领带穿搭
    ├── jeans_juess.jpg       # 全身多品类穿搭
    ├── swither.jpg
    ├── skrit.jpg
    ├── muti_check.jpg
    ├── muti_cloth.jpg
    └── sy_yellow_mao.jpg
```

### 8.3 运行测试

```bash
cd ai-engine/test/test_file
python test_garment_segment.py
```

### 8.4 生成结果目录

```
ai-engine/test/test_res/单品识别/jeans_juess_res/
├── jeans_juess_原图.jpg
├── jeans_juess_items.json          # 识别结果 JSON（含所有字段 + render_result）
├── 01_DRESS_蓝色牛仔连衣裙.png
├── 02_SHOES_黑色平底鞋.png
├── 03_HEADWEAR_米色宽檐草帽.png
├── 04_JEWELRY_金色圆环耳环.png
├── 05_JEWELRY_金色手镯.png
├── 06_OTHER_粉色手机.png
├── 07_OTHER_护照.png
├── 08_OTHER_白色太阳镜.png
├── 09_OTHER_复古相机.png
├── 10_OTHER_白色笔记本电脑.png
├── 11_OTHER_机票.png
├── 12_OTHER_行李牌.png
└── 13_OTHER_手机壳.png
```

### 8.5 结果 JSON 格式

每个单品返回的识别字段：

```json
{
  "category": "DRESS",
  "name": "蓝色牛仔连衣裙",
  "sub_category": "",
  "primary_color": "Denim Blue",
  "secondary_colors": [],
  "material": "Denim",
  "silhouette": "A字",
  "pattern": "Solid",
  "pattern_detail": "纯色牛仔布纹理",
  "style_tags": ["Casual"],
  "completeness": "complete",
  "confidence": 0.98,
  "reason": "完整",
  "missing_parts": "",
  "season_suitability": "Summer",
  "bbox": {"x": 0.15, "y": 0.05, "width": 0.70, "height": 0.90, "description": "连衣裙主体"},
  "render_result": {
    "success": true,
    "image_urls": ["https://..."],
    "error": ""
  }
}
```

### 8.6 倒计时

```bash
cd ai-engine/test/test_file
powershell -Command "$start = Get-Date; python test_garment_segment.py; $end = Get-Date; $elapsed = $end - $start; Write-Host '总耗时:' $([math]::Round($elapsed.TotalSeconds, 1)) '秒'"
```

---

## 附录

### A. 本次修改文件清单

| 文件 | 变更类型 |
|------|----------|
| `ai-engine/services/garment_segmenter.py` | 重构：新增 `_edit_non_garment`、`_generate_from_text_with_ref`、`_extract_images`，重写 `_call_image_edit`，修改 `_crop_garment`、`segment` |
| `ai-engine/utils/response_parser.py` | Bug 修复：`_repair_truncated_json` 括号闭合顺序 |
| `ai-engine/prompts/garment_segmentation.py` | 优化：紧凑 JSON 格式 + `{"items":[...]}` 包装 |

### B. 参考文档

- [AI 大模型内核实现方案](../AI_KERNEL_IMPLEMENTATION.md)
- [阿里云百炼 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [Qwen-Image-Edit API 文档](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-image-edit-api)

---

*文档维护：Veslune Team · 最后更新：2026-06-23*
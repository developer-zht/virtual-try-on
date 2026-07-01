# Veslune AI 大模型内核实现方案

> **穿搭智能推荐助手** — 基于阿里百炼 DashScope 的 AI 内核
> 版本：v2.0 · 日期：2026-06-22 · 实现语言：Python · 通信协议：gRPC

---

## 目录

- [1. 概述](#1-概述)
- [2. 系统架构](#2-系统架构)
- [3. 模型选型与 API 对接](#3-模型选型与-api-对接)
- [4. gRPC 服务定义](#4-grpc-服务定义)
- [5. 核心模块实现](#5-核心模块实现)
- [6. 数据流设计](#6-数据流设计)
- [7. 部署与配置](#7-部署与配置)
- [8. 与后端服务的集成](#8-与后端服务的集成)
- [9. 测试与稳定性](#9-测试与稳定性)

---

## 1. 概述

### 1.1 文档定位

本文档是 Veslune 项目中 **AI 大模型内核** 的完整实现方案，基于 [Veslune PRD（产品需求文档）](../proj_dex/Veslune.html) 和 [Demo 技术方案](../DEMO_PLAN.md) 合并总结而成。

实际代码位于 [ai-engine/](../ai-engine/) 目录，使用 **Python 3.12** 实现。

### 1.2 AI 内核定位

AI 内核是 Veslune 的 **核心差异化模块**，作为独立微服务运行，负责全部 AI 相关能力：

| 能力 | 说明 | 使用的百炼模型 | 实现文件 |
|------|------|---------------|----------|
| **单品识别** | 上传服装照片，识别品类、颜色、材质、风格、季节 | qwen-vl-plus | `services/garment_recognizer.py` |
| **风格拆解** | 上传穿搭照片，拆解配色方案、廓形、叠穿、关键单品 | qwen-vl-max | `services/style_decomposer.py` |
| **风格匹配** | 将目标风格与用户衣橱单品进行匹配 | qwen-plus | `services/style_matcher.py` |
| **穿搭推荐** | 根据天气+场合+衣橱生成穿搭方案 | qwen-max | `services/outfit_recommender.py` |
| **虚拟试穿** | 基于穿搭单品生成模特穿着效果图（异步） | wanx2.1-t2i-turbo | `services/tryon_generator.py` |
| **穿搭 Tips** | 生成穿搭搭配建议（模板+AI双模式） | qwen-plus（可选） | `services/tips_generator.py` |
| **衣物抠图** | 移除服装图片背景，输出透明 PNG | 本地 rembg | `services/bg_remover.py` |

### 1.3 与 Demo Plan 的对应关系

| Demo Plan 模块 | AI 内核对应 | 通信方式 |
|---------------|-------------|----------|
| `internal/ai/client.go` | `models/dashscope_client.py` | HTTP (OpenAI SDK) |
| `internal/ai/recognize.go` | `services/garment_recognizer.py` | gRPC |
| `internal/ai/parser.go` | `utils/response_parser.py` | 本地逻辑 |
| 穿搭推荐 / 风格拆解 F3 | `services/style_decomposer.py` | gRPC |
| 风格匹配 F4 | `services/style_matcher.py` | gRPC |
| 虚拟试穿 F5 | `services/tryon_generator.py` | gRPC（异步） |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      Veslune-Backend                          │
│                      Go + Gin（主业务）                        │
│  ┌──────────┬──────────┬──────────┬────────────────────────┐ │
│  │  auth    │ wardrobe │ recommend│  weather               │ │
│  └──────────┴──────────┴──────────┴────────────────────────┘ │
│                              │                                │
│                    gRPC Client (ai/v1)                        │
└──────────────────────────────┼───────────────────────────────┘
                               │ gRPC (Protobuf)
┌──────────────────────────────▼───────────────────────────────┐
│                  AI Engine (Python 3.12)                       │
│                      gRPC Server + 业务逻辑                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  config/settings.py    — 配置管理（.env + 环境变量）      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  models/                                               │ │
│  │  ├── dashscope_client.py  — 百炼 API 客户端（OpenAI SDK）│ │
│  │  ├── vision_model.py      — 视觉模型 (qwen-vl-plus/max) │ │
│  │  ├── text_model.py        — 文本模型 (qwen-plus/max)    │ │
│  │  └── image_gen_model.py   — 图像生成 (wanx2.1-t2i-turbo)│ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  services/                                             │ │
│  │  ├── garment_recognizer.py  — 1. 单品识别               │ │
│  │  ├── style_decomposer.py    — 2. 风格拆解               │ │
│  │  ├── style_matcher.py       — 3. 风格匹配               │ │
│  │  ├── outfit_recommender.py  — 4. 穿搭推荐（规则引擎+LLM）│ │
│  │  ├── tryon_generator.py     — 5. 虚拟试穿（异步）        │ │
│  │  ├── tips_generator.py      — 6. 穿搭 Tips（模板+AI）    │ │
│  │  ├── bg_remover.py          — 7. 衣物抠图（本地 rembg）  │ │
│  │  └── task_manager.py        — 异步任务管理器             │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  prompts/  — LLM 提示词模板（中英文）                     │ │
│  │  utils/    — JSON 解析 / 图片处理 / Proto 映射           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬────────────────────────────┘
                                  │ HTTPS
┌─────────────────────────────────▼────────────────────────────┐
│              阿里百炼 DashScope API                            │
│    https://dashscope.aliyuncs.com/compatible-mode/v1          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ qwen-vl-plus  │ │ qwen-max     │ │ wanx2.1-t2i-turbo   │  │
│  │ qwen-vl-max   │ │ qwen-plus    │ │ (图像生成)            │  │
│  │ (视觉理解)     │ │ (文本推理)    │ │                      │  │
│  └──────────────┘ └──────────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 为什么选择 Python + gRPC

| 维度 | 说明 |
|------|------|
| **Python** | 百炼官方 SDK 为 Python 优先，生态成熟（Pillow/rembg 等）；AI 领域 Python 是事实标准 |
| **gRPC** | Protobuf 序列化体积小、HTTP/2 多路复用、强类型、原生支持流式传输 |
| **分层架构** | config → models → services → prompts，依赖注入、职责清晰、易于测试 |

### 2.3 目录结构

```
ai-engine/
├── .env                                # 环境变量（API Key 等）
├── requirements.txt                    # Python 依赖
├── test_stability.py                   # 11 项稳定性测试
├── config/
│   ├── __init__.py
│   └── settings.py                     # Settings 配置类（dataclass）
├── models/
│   ├── __init__.py
│   ├── dashscope_client.py             # 百炼 API 客户端（OpenAI SDK）
│   ├── vision_model.py                 # 视觉模型封装
│   ├── text_model.py                   # 文本模型封装
│   └── image_gen_model.py              # 图像生成模型封装
├── prompts/
│   ├── __init__.py
│   ├── garment_recognition.py          # 单品识别 Prompt
│   ├── style_decomposition.py          # 风格拆解 Prompt
│   ├── outfit_recommendation.py        # 穿搭推荐 + 风格匹配 Prompt
│   ├── tips_generation.py              # Tips 生成 Prompt
│   └── tryon_prompt.py                 # 虚拟试穿 Prompt 构建器
├── services/
│   ├── __init__.py
│   ├── task_manager.py                 # 异步任务管理器（内存 + TTL 清理）
│   ├── garment_recognizer.py           # 单品识别服务
│   ├── style_decomposer.py             # 风格拆解服务
│   ├── style_matcher.py                # 风格匹配服务
│   ├── outfit_recommender.py           # 穿搭推荐服务
│   ├── tryon_generator.py              # 虚拟试穿服务（异步）
│   ├── tips_generator.py               # 穿搭 Tips 服务
│   └── bg_remover.py                   # 衣物抠图服务
└── utils/
    ├── __init__.py
    ├── response_parser.py              # LLM JSON 响应解析（多层策略）
    ├── image_utils.py                  # 图片预处理 / Base64 / 下载
    └── proto_mapper.py                 # Proto ↔ Dict 映射（枚举翻译）
```

---

## 3. 模型选型与 API 对接

### 3.1 百炼模型清单

| 模型 | 类型 | 用途 | 推荐度 |
|------|------|------|--------|
| **qwen-vl-max** | 视觉理解 | 风格拆解（最强视觉推理） | ⭐⭐⭐⭐⭐ |
| **qwen-vl-plus** | 视觉理解 | 单品识别（性价比高） | ⭐⭐⭐⭐ |
| **qwen-max** | 文本推理 | 穿搭推荐（最强文本推理） | ⭐⭐⭐⭐⭐ |
| **qwen-plus** | 文本推理 | 风格匹配、Tips 生成 | ⭐⭐⭐⭐ |
| **wanx2.1-t2i-turbo** | 图像生成 | 虚拟试穿（快速） | ⭐⭐⭐⭐⭐ |
| **qwen-turbo** | 文本 | 健康检查（极低成本） | — |

### 3.2 API 基础信息

```
Base URL:  https://dashscope.aliyuncs.com/compatible-mode/v1
认证方式:  Bearer Token (API Key)
协议兼容:  OpenAI API 格式（可直接使用 openai Python SDK）
```

### 3.3 视觉模型调用（Chat Completions）

**端点**: `POST /chat/completions`

```json
{
  "model": "qwen-vl-plus",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional fashion analyst..."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": { "url": "https://example.com/garment.jpg" }
        },
        {
          "type": "text",
          "text": "Analyze the clothing in this image."
        }
      ]
    }
  ],
  "temperature": 0.1,
  "max_tokens": 2000,
  "response_format": { "type": "json_object" }
}
```

### 3.4 图像生成模型调用（Image Generations）

**端点**: `POST /images/generations`

```json
{
  "model": "wanx2.1-t2i-turbo",
  "prompt": "A female model, standard build, wearing white cotton shirt, black jeans...",
  "size": "1024x1024",
  "n": 1
}
```

---

## 4. gRPC 服务定义

### 4.1 Proto 文件

Proto 定义位于 `api/proto/ai/v1/`，包含公共类型（品类枚举、颜色枚举、GarmentItem 消息）和两个服务定义（DecomposeService、ReconstructService）。Proto 文件由 Go 后端编译生成 Go 代码，Python 侧使用 `proto_mapper.py` 进行 dict ↔ proto 的转换。

### 4.2 核心枚举

```protobuf
// 品类枚举
enum GarmentCategory {
  GARMENT_CATEGORY_UNSPECIFIED = 0;
  GARMENT_CATEGORY_TOPS = 1;        // 上衣
  GARMENT_CATEGORY_PANTS = 2;       // 裤装
  GARMENT_CATEGORY_SKIRTS = 3;      // 裙装
  GARMENT_CATEGORY_OUTERWEAR = 4;   // 外套
  GARMENT_CATEGORY_SHOES = 5;       // 鞋履
  GARMENT_CATEGORY_ACCESSORIES = 6; // 配饰
  GARMENT_CATEGORY_ONEPIECE = 7;    // 连衣裙
  GARMENT_CATEGORY_UNKNOWN = 99;    // 无法识别
}

// 颜色枚举（19 种）
enum Color {
  COLOR_UNSPECIFIED = 0;
  COLOR_BLACK = 1;     COLOR_WHITE = 2;
  COLOR_GRAY = 3;      COLOR_RED = 4;
  COLOR_BLUE = 5;      COLOR_GREEN = 6;
  COLOR_YELLOW = 7;    COLOR_PURPLE = 8;
  COLOR_PINK = 9;      COLOR_BROWN = 10;
  COLOR_KHAKI = 11;    COLOR_DENIM_BLUE = 12;
  COLOR_ORANGE = 13;   COLOR_BEIGE = 14;
  COLOR_CAMEL = 15;    COLOR_BURGUNDY = 16;
  COLOR_NAVY = 17;     COLOR_OLIVE = 18;
  COLOR_MULTI = 19;
}

// 风格标签枚举（14 种）
enum StyleTag {
  STYLE_TAG_UNSPECIFIED = 0;
  STYLE_TAG_MINIMALIST = 1;   // 简约
  STYLE_TAG_STREET = 2;       // 街头
  STYLE_TAG_JAPANESE = 3;     // 日系
  STYLE_TAG_KOREAN = 4;       // 韩系
  STYLE_TAG_EUROPEAN = 5;     // 欧美
  STYLE_TAG_VINTAGE = 6;      // 复古
  STYLE_TAG_SWEET = 7;        // 甜美
  STYLE_TAG_BOHEMIAN = 8;     // 波西米亚
  STYLE_TAG_BUSINESS = 9;     // 商务
  STYLE_TAG_SPORTY = 10;      // 运动
  STYLE_TAG_PUNK = 11;        // 朋克
  STYLE_TAG_PREPPY = 12;      // 学院
  STYLE_TAG_GIRLY = 13;       // 少女
  STYLE_TAG_ELEGANT = 14;     // 优雅
}

// 材质枚举（17 种）
enum Material {
  MATERIAL_UNSPECIFIED = 0;
  MATERIAL_COTTON = 1;       MATERIAL_LINEN = 2;
  MATERIAL_SILK = 3;         MATERIAL_WOOL = 4;
  MATERIAL_CASHMERE = 5;     MATERIAL_LEATHER = 6;
  MATERIAL_DENIM = 7;        MATERIAL_POLYESTER = 8;
  MATERIAL_NYLON = 9;        MATERIAL_KNIT = 10;
  MATERIAL_CHIFFON = 11;     MATERIAL_VELVET = 12;
  MATERIAL_LACE = 13;        MATERIAL_SWEATER = 14;
  MATERIAL_DOWN = 15;        MATERIAL_FUR = 16;
  MATERIAL_SYNTHETIC = 17;
}
```

---

## 5. 核心模块实现

### 5.1 config/settings.py — 配置管理

**职责**：API Key 管理、模型选择、超时控制，支持 `.env` 文件和环境变量。

```python
# config/settings.py
from dataclasses import dataclass, field
from dotenv import load_dotenv
import os

load_dotenv()

@dataclass
class Settings:
    # DashScope API
    dashscope_api_key: str = field(default_factory=lambda: os.getenv("DASHSCOPE_API_KEY", ""))
    dashscope_base_url: str = field(default_factory=lambda: os.getenv(
        "DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ))

    # 模型名称（4 种模型独立配置）
    vision_model: str = "qwen-vl-plus"
    vision_model_max: str = "qwen-vl-max"
    text_model: str = "qwen-plus"
    text_model_max: str = "qwen-max"
    image_gen_model: str = "wanx2.1-t2i-turbo"

    # 超时与重试
    request_timeout: int = 60
    max_retries: int = 2
    retry_delay: float = 1.0

    # 图片处理
    max_image_size: int = 5          # MB
    max_image_dimension: int = 2048

    # gRPC
    grpc_host: str = "0.0.0.0"
    grpc_port: int = 50051

    # 降级开关
    enable_vision_fallback: bool = True
    enable_text_fallback: bool = True

    def set_api_key(self, key: str):
        self.dashscope_api_key = key

    def validate(self) -> bool:
        return bool(self.dashscope_api_key)

# 全局单例
settings = Settings()
```

**关键设计决策**：
- `python-dotenv` 自动加载 `.env` 文件，兼容 Docker / K8s 环境变量注入
- 4 种模型独立配置：`vision_model` / `vision_model_max` / `text_model` / `text_model_max` / `image_gen_model`
- 降级开关：`enable_vision_fallback` 和 `enable_text_fallback` 控制模型不可用时的降级策略

### 5.2 models/dashscope_client.py — 百炼 API 客户端

**职责**：封装对 DashScope OpenAI 兼容 API 的 HTTP 调用，使用 `openai` Python SDK。

```python
# models/dashscope_client.py
from openai import OpenAI

class DashScopeClient:
    def __init__(self, api_key: str, base_url: str, timeout: int = 60, max_retries: int = 2):
        if not api_key:
            raise ValueError("API Key not set")
        self._client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )

    def chat_completion(self, model: str, messages: list[dict],
                        temperature: float = 0.1, max_tokens: int = 2000,
                        response_format: dict = None) -> str:
        response = self._client.chat.completions.create(
            model=model, messages=messages,
            temperature=temperature, max_tokens=max_tokens,
            response_format=response_format,
        )
        return response.choices[0].message.content or ""

    def image_generation(self, model: str, prompt: str,
                         size: str = "1024x1024", n: int = 1,
                         negative_prompt: str = None, seed: int = None) -> dict:
        response = self._client.images.generate(
            model=model, prompt=prompt, size=size, n=n,
            extra_body={"negative_prompt": negative_prompt} if negative_prompt else None,
        )
        return {"data": [{"url": img.url} for img in response.data]}

    def health_check(self) -> bool:
        try:
            self.chat_completion("qwen-turbo", [{"role": "user", "content": "ping"}], max_tokens=10)
            return True
        except Exception:
            return False
```

**关键设计决策**：
- 直接使用 `openai` SDK，百炼 `compatible-mode/v1` 端点完全兼容
- `chat_completion()` 返回纯文本内容，`image_generation()` 返回标准化 dict
- `health_check()` 使用 `qwen-turbo` 发送最小请求（1 token），成本极低

### 5.3 models/ — 模型封装层

三个模型封装类，提供统一的 API 并注入默认模型名和参数：

```python
# models/vision_model.py — 视觉模型（多模态）
class VisionModel:
    def __init__(self, client: DashScopeClient, model_name: str = "qwen-vl-plus"):
        self.client = client
        self.model_name = model_name

    def chat(self, system_prompt: str, user_prompt: str,
             images: list[str] = None, temperature: float = 0.1,
             max_tokens: int = 2000, json_mode: bool = True) -> str:
        # 构建多模态消息：image_url + text
        content_parts = []
        if images:
            for img in images:
                content_parts.append({"type": "image_url", "image_url": {"url": img}})
        content_parts.append({"type": "text", "text": user_prompt})
        messages = [{"role": "system", "content": system_prompt},
                    {"role": "user", "content": content_parts}]
        return self.client.chat_completion(
            model=self.model_name, messages=messages,
            temperature=temperature, max_tokens=max_tokens,
            response_format={"type": "json_object"} if json_mode else None,
        )

# models/text_model.py — 文本模型
class TextModel:
    def __init__(self, client: DashScopeClient, model_name: str = "qwen-plus"):
        ...

# models/image_gen_model.py — 图像生成模型
class ImageGenModel:
    def __init__(self, client: DashScopeClient, model_name: str = "wanx2.1-t2i-turbo"):
        ...
```

### 5.4 services/garment_recognizer.py — 单品识别

**职责**：上传服装照片 → 识别品类、颜色、材质、风格标签、季节。

**流程**：图片预处理 → Base64 编码 → 调用 qwen-vl-plus → 解析 JSON → 枚举校验 → 返回结构化结果。

**校验机制**：
- 8 种品类、19 种颜色、17 种材质、14 种风格、5 种季节 → 全部通过白名单校验
- 识别失败时自动降级到 `FALLBACK_RESULT`（category="UNKNOWN", confidence=0.0）

**返回格式**：
```json
{
  "success": true,
  "garment": {
    "category": "TOPS",
    "primary_color": "White",
    "secondary_colors": [],
    "material": "Cotton",
    "style_tags": ["Minimalist", "Korean"],
    "confidence": 0.92,
    "reason": "White button-up shirt with collar, cotton fabric",
    "season_suitability": "All-season",
    "is_manually_edited": false
  },
  "processing_time_ms": 1234
}
```

### 5.5 services/style_decomposer.py — 风格拆解

**职责**：上传穿搭照片 → 拆解配色方案、廓形、叠穿层次、关键单品、整体风格。

**使用模型**：qwen-vl-max（最强视觉理解）

**支持 focus_areas 参数**：可指定只分析特定维度（如 `["color_scheme", "silhouette"]`），减少 token 消耗。

**返回格式**：
```json
{
  "success": true,
  "decomposition": {
    "color_scheme": {
      "dominant_color": "Khaki",
      "accent_colors": ["White", "Blue"],
      "palette_description": "Warm earth tones with crisp blue-white accents",
      "color_harmony": "Analogous"
    },
    "silhouette": "H-type",
    "layering": {
      "description": "Three-layer: white inner, blue middle, khaki outer",
      "layers": ["Inner: T-shirt", "Middle: Striped shirt", "Outer: Trench coat"],
      "layering_type": "Outer-long-inner-short"
    },
    "key_items": [...],
    "overall_style": ["Korean", "Minimalist", "Elegant"],
    "style_summary": "Korean minimalist urban style",
    "confidence": 0.90
  }
}
```

### 5.6 services/outfit_recommender.py — 穿搭推荐

**职责**：根据天气 + 场合 + 用户衣橱 → 生成 1-3 套穿搭方案。

**使用模型**：qwen-max（最强文本推理）

**核心流程**：
1. **预检查**：衣橱至少 5 件单品
2. **规则引擎预过滤**：温度 > 25°C 时过滤羽绒/羊毛/皮草等厚重外套；支持排除指定单品/颜色/品类
3. **LLM 生成推荐**：传入天气、场合、偏好、过滤后的衣橱列表
4. **为每套穿搭生成 UUID** 作为 outfit_id

**规则引擎**：
```python
def _apply_rules(self, wardrobe, weather, occasion, avoid_ids, avoid_colors, avoid_categories):
    # 1. 排除用户指定的单品/颜色/品类
    # 2. 温度 > 25°C: 过滤厚重外套（Down, Wool, Fur）
    # 3. 返回过滤后的衣橱
```

### 5.7 services/tryon_generator.py — 虚拟试穿（异步）

**职责**：基于穿搭单品列表生成模特穿着效果图。

**使用模型**：wanx2.1-t2i-turbo

**异步流程**：创建任务 → 返回 task_id → 后台线程执行生成 → 轮询 task_id 获取结果。

**Prompt 构建**（`prompts/tryon_prompt.py`）：
```python
def build_tryon_prompt(user_body, outfit_items, pose="standing", background="studio"):
    # 根据用户身体特征（性别、体型、身高、肤色）+ 姿势 + 背景 + 穿搭单品拼接英文 prompt
    prompt = (
        f"A {gender}, {body_desc}, {height}cm, {skin_tone} skin tone, {pose_desc}. "
        f"Wearing: {items_desc}. {bg_desc}. "
        f"High quality fashion photography, full body, 8K resolution."
    )
    return prompt
```

### 5.8 services/tips_generator.py — 穿搭 Tips

**职责**：生成穿搭搭配建议。

**双模式设计**：
- **模板模式**（默认，零成本）：按场合（通勤/休闲/约会/运动/正式）从预设模板库随机采样，每个场合 5 条模板
- **AI 模式**（可选，个性化）：调用 qwen-plus 生成针对性建议

**天气适配**：模板模式自动根据温度追加建议（< 10°C 保暖建议，> 30°C 防晒建议）。

### 5.9 services/bg_remover.py — 衣物抠图

**职责**：移除服装图片背景，输出透明 PNG。

**使用**：`rembg` 库本地处理，无需云 API。

### 5.10 services/task_manager.py — 异步任务管理器

**职责**：管理异步任务（虚拟试穿等耗时操作）的生命周期。

**核心设计**：
- 基于 `OrderedDict` 的内存存储，`threading.Lock` 保证线程安全
- TTL 机制（默认 3600 秒），后台 daemon 线程每 60 秒清理过期任务
- 可替换为 Redis 用于生产环境

### 5.11 utils/response_parser.py — JSON 解析

**三层解析策略**：
1. 直接 `json.loads()` 清理后的文本
2. 正则提取第一个 `{...}` JSON 对象
3. 正则提取第一个 `[...]` JSON 数组

**辅助函数**：
- `clean_json()` — 清理 Markdown 代码块标记（`` ```json ... ``` ``）
- `clamp_confidence()` — 将置信度限制在 0.0-1.0
- `validate_enum()` — 白名单校验枚举值

### 5.12 utils/image_utils.py — 图片处理

- `preprocess_image()` — RGBA → RGB 转换、等比缩放（LANCZOS）、压缩输出
- `image_to_base64()` — 生成 `data:image/{format};base64,...` Data URI
- `download_image()` — 从 URL 下载图片

### 5.13 utils/proto_mapper.py — Proto 映射

提供 Proto 消息与 Python dict 之间的双向转换，包含完整的枚举值中英文映射表（品类 9 种、颜色 20 种、材质 18 种、风格 15 种、廓形 7 种、场合 6 种）。

---

## 6. 数据流设计

### 6.1 完整穿搭推荐流程

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ 用户上传   │     │  Veslune     │     │  AI Engine   │     │  百炼 API │
│ 穿搭照片   │     │  Backend     │     │  (Python)    │     │          │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬─────┘
     │                  │                    │                  │
     │  POST /upload    │                    │                  │
     │─────────────────>│                    │                  │
     │                  │  gRPC: Recognize   │                  │
     │                  │───────────────────>│                  │
     │                  │                    │  ChatCompletion  │
     │                  │                    │─────────────────>│
     │                  │                    │  {qwen-vl-plus}  │
     │                  │                    │<─────────────────│
     │                  │  GarmentResult     │                  │
     │                  │<───────────────────│                  │
     │                  │                    │                  │
     │  展示识别结果      │                    │                  │
     │<─────────────────│                    │                  │
     │  (用户确认/修正)   │                    │                  │
     │                  │                    │                  │
     │  点击"获取推荐"    │                    │                  │
     │─────────────────>│                    │                  │
     │                  │  gRPC: Recommend   │                  │
     │                  │  (weather+wardrobe)│                  │
     │                  │───────────────────>│                  │
     │                  │                    │  ChatCompletion  │
     │                  │                    │─────────────────>│
     │                  │                    │  {qwen-max}      │
     │                  │                    │<─────────────────│
     │                  │  OutfitPlans[]     │                  │
     │                  │<───────────────────│                  │
     │                  │                    │                  │
     │  展示穿搭方案      │                    │                  │
     │<─────────────────│                    │                  │
     │                  │                    │                  │
     │  点击"虚拟试穿"    │                    │                  │
     │─────────────────>│                    │                  │
     │                  │  gRPC: TryOnAsync  │                  │
     │                  │───────────────────>│                  │
     │                  │  { task_id }       │                  │
     │                  │<───────────────────│                  │
     │                  │                    │ ── 后台线程 ──>   │
     │                  │                    │  ImageGeneration │
     │                  │  gRPC: GetTask()   │  {wanx2.1}       │
     │                  │───────────────────>│<─────────────────│
     │                  │  { status: DONE }  │                  │
     │                  │<───────────────────│                  │
     │  展示试穿效果图    │                    │                  │
     │<─────────────────│                    │                  │
```

### 6.2 模块依赖关系

```
[.env] ──> config/settings.py (全局 settings 单例)

models/dashscope_client.py (底层: OpenAI SDK)
    │
    ├── models/vision_model.py     (qwen-vl-plus / qwen-vl-max)
    ├── models/text_model.py       (qwen-plus / qwen-max)
    └── models/image_gen_model.py  (wanx2.1-t2i-turbo)

prompts/ (纯字符串常量，无依赖)
    ├── garment_recognition.py
    ├── style_decomposition.py
    ├── outfit_recommendation.py   (含 STYLE_MATCH + OUTFIT_RECOMMEND)
    ├── tips_generation.py
    └── tryon_prompt.py (build_tryon_prompt 函数)

utils/
    ├── response_parser.py   (JSON 解析，独立)
    ├── image_utils.py       (PIL 图片处理)
    └── proto_mapper.py      (protobuf 转换)

services/  (依赖注入方式接收模型实例)
    ├── garment_recognizer.py  ──> vision_model + garment_recognition prompts
    ├── style_decomposer.py    ──> vision_model + style_decomposition prompts
    ├── style_matcher.py       ──> text_model + STYLE_MATCH prompts
    ├── outfit_recommender.py  ──> text_model + OUTFIT_RECOMMEND prompts
    ├── tryon_generator.py     ──> image_gen_model + tryon_prompt + task_manager
    ├── tips_generator.py      ──> text_model(可选) + tips prompts
    ├── bg_remover.py          ──> rembg(可选) + PIL
    └── task_manager.py        ──> 独立(标准库)
```

---

## 7. 部署与配置

### 7.1 环境变量

```env
# 必填
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxx

# 模型选择
VISION_MODEL=qwen-vl-plus
VISION_MODEL_MAX=qwen-vl-max
TEXT_MODEL=qwen-plus
TEXT_MODEL_MAX=qwen-max
IMAGE_GEN_MODEL=wanx2.1-t2i-turbo

# 超时与重试
REQUEST_TIMEOUT=60
MAX_RETRIES=2
RETRY_DELAY=1.0

# gRPC
GRPC_HOST=0.0.0.0
GRPC_PORT=50051
GRPC_MAX_WORKERS=10

# 降级开关
ENABLE_VISION_FALLBACK=true
ENABLE_TEXT_FALLBACK=true

# 日志
LOG_LEVEL=INFO
```

### 7.2 安装与运行

```bash
cd ai-engine
pip install -r requirements.txt    # 安装依赖
python test_stability.py           # 运行稳定性测试
# 启动 gRPC 服务（待实现 server.py）
python server.py
```

### 7.3 Docker Compose 集成

```yaml
services:
  ai-engine:
    build:
      context: ./ai-engine
      dockerfile: Dockerfile
    ports:
      - "50051:50051"
    environment:
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - GRPC_PORT=50051
    restart: unless-stopped
```

### 7.4 后端调用方式

Veslune Backend (Go) 通过 gRPC 客户端调用 AI Engine：

```go
// Go 后端 gRPC 客户端
conn, _ := grpc.Dial("ai-engine:50051", grpc.WithInsecure())
client := pb.NewAIServiceClient(conn)

// 单品识别
resp, _ := client.RecognizeGarment(ctx, &pb.RecognizeGarmentRequest{
    ImageUrl: "https://cdn.example.com/garment.jpg",
})

// 穿搭推荐
resp, _ := client.RecommendOutfit(ctx, &pb.RecommendOutfitRequest{
    Weather:  &pb.Weather{Temperature: 22, Condition: "Sunny"},
    Occasion: "commute",
    Wardrobe: wardrobeItems,
})
```

---

## 8. 与后端服务的集成

### 8.1 集成点映射

| 后端模块 | 调用的 AI Engine 服务 | 说明 |
|----------|----------------------|------|
| `internal/wardrobe/` | `GarmentRecognizer` | 用户上传衣物时自动识别属性 |
| `internal/wardrobe/` | `BackgroundRemover` | 衣物照片背景去除 |
| `internal/outfit/` | `StyleDecomposer` | 风格拆解：上传明星穿搭照片分析 |
| `internal/recommend/` | `OutfitRecommender` | 穿搭推荐：天气+场合+衣橱 |
| `internal/recommend/` | `StyleMatcher` | 风格匹配：目标风格 vs 衣橱 |
| `internal/outfit/` | `TryOnGenerator` | 虚拟试穿：生成穿搭效果图 |
| `internal/outfit/` | `TipsGenerator` | 穿搭建议：模板/AI 双模式 |

### 8.2 兼容现有 Demo Plan

现有 Go 后端 `internal/ai/` 中的 `types.go` 模型常量和类型结构保持不变，gRPC 通信由 Go 后端作为客户端发起，Python AI Engine 作为服务端响应。

---

## 9. 测试与稳定性

### 9.1 测试脚本

`test_stability.py` 包含 11 项测试，覆盖所有核心模块：

| # | 测试项 | 类型 | 说明 |
|---|--------|------|------|
| 1 | Config 加载 | 本地 | 验证所有配置字段正确加载 |
| 2 | DashScope 客户端初始化 | 本地 | 验证 OpenAI SDK 客户端创建 |
| 3 | 文本模型 API 调用 | API | 实际调用 qwen-turbo 并解析 JSON |
| 4 | API 健康检查 | API | 验证 DashScope 服务可用性 |
| 5 | Prompt 模板加载 | 本地 | 验证 5 个 Prompt 文件完整性 |
| 6 | JSON 响应解析器 | 本地 | 测试 clean_json / parse_json_response |
| 7 | 单品识别校验逻辑 | 本地 | 验证枚举白名单集合 |
| 8 | Tips 生成器（模板） | 本地 | 验证模板模式生成 3 条建议 |
| 9 | 任务管理器 | 本地 | 测试创建/更新/查询/过期清理 |
| 10 | 风格匹配器 | 本地 | 验证衣橱格式化方法 |
| 11 | 穿搭推荐规则引擎 | 本地 | 测试高温过滤、排除逻辑、最低数量 |

### 9.2 运行测试

```bash
cd ai-engine
python test_stability.py
```

### 9.3 测试结果（2026-06-22）

```
Total: 11 | Passed: 11 | Failed: 0
```

所有测试通过，包括 API 调用测试和本地逻辑测试。

---

## 附录

### A. 依赖清单 (requirements.txt)

```
grpcio>=1.60.0
grpcio-tools>=1.60.0
protobuf>=4.25.0
openai>=1.6.0
pillow>=10.0.0
requests>=2.31.0
python-dotenv>=1.0.0
pydantic>=2.5.0
loguru>=0.7.0
httpx>=0.25.0
```

### B. 参考文档

- [阿里云百炼 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [Qwen-VL 视觉模型文档](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-qianwen-vl-plus-api)
- [通义万相图像生成文档](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-wanxiang-image-generation)
- [Veslune PRD（完整版）](../proj_dex/Veslune.html)
- [Veslune Demo 技术方案](../DEMO_PLAN.md)
- [AI Engine 模块规格说明](../AI_MODULE_SPEC.md)

---

*文档维护：Veslune Team · 最后更新：2026-06-22*
# Veslune AI 引擎 — 大模型内核实现

> **版本**：v1.0 · **日期**：2026-06-22 · **语言**：Python 3.11+\
> **模型平台**：阿里云百炼 DashScope（`https://dashscope.aliyuncs.com/compatible-mode/v1`）\
> **通信协议**：gRPC（与 Go 后端交互）\
> **定位**：纯 AI 功能模块，不包含业务后端

***

## 目录

- [1. 概述](#1-概述)
- [2. 模型选型](#2-模型选型)
- [3. 项目目录结构](#3-项目目录结构)
- [4. 配置管理](#4-配置管理)
- [5. 模块一：衣物识别（Garment Recognition）](#5-模块一衣物识别garment-recognition)
- [6. 模块二：风格拆解（Style Decomposition）](#6-模块二风格拆解style-decomposition)
- [7. 模块三：风格匹配穿搭（Style Matching）](#7-模块三风格匹配穿搭style-matching)
- [8. 模块四：穿搭推荐（Outfit Recommendation）](#8-模块四穿搭推荐outfit-recommendation)
- [9. 模块五：虚拟试穿（Virtual Try-On）](#9-模块五虚拟试穿virtual-try-on)
- [10. 模块六：穿搭 Tips 生成](#10-模块六穿搭-tips-生成)
- [11. 模块七：衣物抠图](#11-模块七衣物抠图)
- [12. gRPC 服务端实现](#12-grpc-服务端实现)
- [13. 部署与运维](#13-部署与运维)
- [14. 与 Go 后端的集成方式](#14-与-go-后端的集成方式)

***

## 1. 概述

### 1.1 功能定位

Veslune AI 引擎是穿搭智能推荐助手的"大脑"，负责所有 AI 模型推理任务。它通过 gRPC 协议向 Go 后端暴露 8 个核心能力：

| # | 能力      | 功能描述                  | 对应 PRD 功能  |
| - | ------- | --------------------- | ---------- |
| 1 | 衣物识别    | 拍照上传 → 品类/颜色/材质/风格标签  | F1 数字衣橱    |
| 2 | 风格拆解    | 上传穿搭照 → 色彩/廓形/层次/单品拆解 | F3 风格拆解    |
| 3 | 风格匹配    | 风格拆解 + 衣橱 → 匹配穿搭方案    | F4 风格匹配    |
| 4 | 穿搭推荐    | 天气 + 场合 + 衣橱 → 推荐穿搭   | F2 智能穿搭推荐  |
| 5 | 虚拟试穿    | 用户体型 + 穿搭单品 → 试穿效果图   | F5 虚拟试穿    |
| 6 | 穿搭 Tips | 穿搭方案 → 实用 Tips        | F6 穿搭 Tips |
| 7 | 衣物抠图    | 单品图片 → 透明背景 PNG       | 辅助功能       |
| 8 | 健康检查    | 服务状态 + 模型可用性          | 运维         |

### 1.2 架构原则

- **无状态**：每个 gRPC 请求独立处理，不存储用户数据
- **同步 + 异步**：短任务（识别/拆解/Tips）同步返回；长任务（虚拟试穿）返回 task\_id 后轮询
- **降级优先**：置信度低时返回标记，由后端决定是否走手动确认流程
- **可配置**：API Key、模型名称、超时时间均通过环境变量/配置文件注入

***

## 2. 模型选型

### 2.1 阿里百炼模型矩阵

| 用途          | 模型名称                                  | 调用方式                         | 说明                     |
| ----------- | ------------------------------------- | ---------------------------- | ---------------------- |
| **视觉识别**    | `qwen-vl-plus`                        | Chat Completions (multipart) | 多模态理解，品类/颜色/材质/风格识别    |
| **风格拆解**    | `qwen-vl-max`                         | Chat Completions (multipart) | 最强视觉推理，穿搭风格要素拆解        |
| **穿搭推荐**    | `qwen-plus` / `qwen-max`              | Chat Completions (text)      | 纯文本推理，结合规则+LLM 生成推荐    |
| **Tips 生成** | `qwen-plus`                           | Chat Completions (text)      | 文本生成，穿搭 Tips           |
| **虚拟试穿**    | `wan2.1-t2i-plus` / `qwen-image-plus` | Image Generation             | 文生图，通过 Prompt 描述生成试穿效果 |
| **衣物抠图**    | `qwen-vl-plus` (辅助) + rembg           | 本地处理                         | 优先本地 rembg，降级用 VL 模型辅助 |

### 2.2 API 调用方式

百炼 DashScope 提供 OpenAI 兼容接口，使用 `openai` Python SDK：

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-xxxxxxxxxxxxx",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
```

**视觉模型调用（多模态）**：

```python
response = client.chat.completions.create(
    model="qwen-vl-plus",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": "https://example.com/garment.jpg"}},
                {"type": "text", "text": "请识别这件衣服的品类和颜色"}
            ]
        }
    ]
)
```

**图像生成模型调用**：

```python
response = client.images.generate(
    model="qwen-image-plus",
    prompt="A person wearing a white shirt, black trousers, brown leather shoes, standing in a studio",
    size="1024x1024",
    n=1
)
```

***

## 3. 项目目录结构

```
veslune/
├── proto/
│   └── ai_service.proto              # gRPC 接口定义（已完成）
│
├── ai-engine/                        # Python AI 引擎
│   ├── requirements.txt              # Python 依赖
│   ├── .env.example                  # 环境变量模板
│   ├── Makefile                      # 构建/运行命令
│   ├── README.md
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py               # 配置管理（API Key、模型名、超时等）
│   │
│   ├── proto/                        # 生成的 gRPC 代码
│   │   ├── __init__.py
│   │   ├── ai_service_pb2.py         # protobuf 消息
│   │   └── ai_service_pb2_grpc.py    # gRPC 服务端/客户端 stub
│   │
│   ├── models/                       # 模型客户端封装
│   │   ├── __init__.py
│   │   ├── dashscope_client.py       # DashScope OpenAI 兼容客户端
│   │   ├── vision_model.py           # 视觉模型（qwen-vl-plus/max）
│   │   ├── text_model.py             # 文本模型（qwen-plus/max）
│   │   └── image_gen_model.py        # 图像生成模型（qwen-image-plus）
│   │
│   ├── services/                     # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── garment_recognizer.py     # 1. 衣物识别
│   │   ├── style_decomposer.py       # 2. 风格拆解
│   │   ├── style_matcher.py          # 3. 风格匹配
│   │   ├── outfit_recommender.py     # 4. 穿搭推荐
│   │   ├── tryon_generator.py        # 5. 虚拟试穿
│   │   ├── tips_generator.py         # 6. 穿搭 Tips
│   │   ├── bg_remover.py             # 7. 衣物抠图
│   │   └── task_manager.py           # 异步任务管理
│   │
│   ├── prompts/                      # Prompt 模板管理
│   │   ├── __init__.py
│   │   ├── garment_recognition.py    # 衣物识别 Prompt
│   │   ├── style_decomposition.py    # 风格拆解 Prompt
│   │   ├── outfit_recommendation.py  # 穿搭推荐 Prompt
│   │   ├── tips_generation.py        # Tips 生成 Prompt
│   │   └── tryon_prompt.py           # 虚拟试穿 Prompt 构建
│   │
│   ├── utils/                        # 工具函数
│   │   ├── __init__.py
│   │   ├── image_utils.py            # 图片处理（压缩、格式转换、Base64）
│   │   ├── response_parser.py        # LLM JSON 响应解析
│   │   ├── color_utils.py            # 颜色映射工具
│   │   └── proto_mapper.py           # Proto ↔ 内部类型映射
│   │
│   ├── server.py                     # gRPC 服务端入口
│   └── tests/                        # 单元测试
│       ├── __init__.py
│       ├── test_garment_recognizer.py
│       ├── test_style_decomposer.py
│       └── test_outfit_recommender.py
│
└── DEMO_PLAN.md
```

***

## 4. 配置管理

### 4.1 配置文件

[config/settings.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/config/settings.py)

```python
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    # DashScope API
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_base_url: str = os.getenv(
        "DASHSCOPE_BASE_URL",
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )

    # 模型名称
    vision_model: str = os.getenv("VISION_MODEL", "qwen-vl-plus")
    vision_model_max: str = os.getenv("VISION_MODEL_MAX", "qwen-vl-max")
    text_model: str = os.getenv("TEXT_MODEL", "qwen-plus")
    text_model_max: str = os.getenv("TEXT_MODEL_MAX", "qwen-max")
    image_gen_model: str = os.getenv("IMAGE_GEN_MODEL", "qwen-image-plus")

    # 超时与重试
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    max_retries: int = int(os.getenv("MAX_RETRIES", "2"))
    retry_delay: float = float(os.getenv("RETRY_DELAY", "0.5"))

    # 图片处理
    max_image_size: int = int(os.getenv("MAX_IMAGE_SIZE", "5"))  # MB
    image_quality: int = int(os.getenv("IMAGE_QUALITY", "85"))
    max_image_dimension: int = int(os.getenv("MAX_IMAGE_DIMENSION", "2048"))

    # gRPC
    grpc_host: str = os.getenv("GRPC_HOST", "0.0.0.0")
    grpc_port: int = int(os.getenv("GRPC_PORT", "50051"))
    grpc_max_workers: int = int(os.getenv("GRPC_MAX_WORKERS", "10"))

    # 虚拟试穿（异步）
    tryon_task_ttl: int = int(os.getenv("TRYON_TASK_TTL", "3600"))  # 秒

    # 降级开关
    enable_vision_fallback: bool = os.getenv("ENABLE_VISION_FALLBACK", "true").lower() == "true"
    enable_text_fallback: bool = os.getenv("ENABLE_TEXT_FALLBACK", "true").lower() == "true"

    # 日志
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
```

### 4.2 环境变量模板

`.env.example`：

```env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

VISION_MODEL=qwen-vl-plus
VISION_MODEL_MAX=qwen-vl-max
TEXT_MODEL=qwen-plus
TEXT_MODEL_MAX=qwen-max
IMAGE_GEN_MODEL=qwen-image-plus

REQUEST_TIMEOUT=30
MAX_RETRIES=2

GRPC_HOST=0.0.0.0
GRPC_PORT=50051
GRPC_MAX_WORKERS=10

LOG_LEVEL=INFO
```

***

## 5. 模块一：衣物识别（Garment Recognition）

### 5.1 功能描述

接收衣物图片，调用 `qwen-vl-plus` 视觉模型，识别品类、主色、材质、风格标签，返回结构化 JSON。

### 5.2 输入输出

| 方向 | 字段                   | 类型              | 说明            |
| -- | -------------------- | --------------- | ------------- |
| 输入 | `image`              | ImageInfo       | 图片 URL 或二进制数据 |
| 输出 | `category`           | GarmentCategory | 品类枚举          |
| 输出 | `primary_color`      | Color           | 主色枚举          |
| 输出 | `secondary_colors`   | Color\[]        | 辅色列表          |
| 输出 | `material`           | Material        | 材质枚举          |
| 输出 | `style_tags`         | StyleTag\[]     | 风格标签          |
| 输出 | `confidence`         | float           | 置信度 0.0-1.0   |
| 输出 | `reason`             | string          | 判断依据          |
| 输出 | `season_suitability` | string          | 适合季节          |

### 5.3 Prompt 模板

[prompts/garment\_recognition.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/garment_recognition.py)

```python
GARMENT_RECOGNITION_SYSTEM = """你是专业的服装识别专家。请分析图片中的主要衣物单品。

# 品类定义（category）：
- 上衣：T恤、衬衫、针织衫、毛衣、卫衣、Polo衫、背心、吊带等
- 裤装：牛仔裤、西裤、休闲裤、运动裤、短裤、阔腿裤、直筒裤等
- 裙装：半身裙、A字裙、百褶裙、包臀裙等
- 连衣裙：连体裙装
- 外套：西装、夹克、风衣、大衣、羽绒服、棒球服、针织开衫等
- 鞋履：运动鞋、皮鞋、高跟鞋、靴子、凉鞋、乐福鞋等
- 配饰：包、帽子、围巾、腰带、手套、首饰等
- 无法识别：图片非衣物或无法判断

# 颜色定义（primary_color 和 secondary_colors）：
可选值：黑/白/灰/红/蓝/绿/黄/紫/粉/棕/卡其/牛仔蓝/橙/米色/驼色/酒红/藏青/军绿/多色

# 材质定义（material）：
可选值：棉/麻/真丝/羊毛/羊绒/皮革/牛仔/涤纶/尼龙/针织/雪纺/丝绒/蕾丝/毛衣/羽绒/皮草/合成材料

# 风格标签（style_tags，可多选）：
可选值：简约/街头/日系/韩系/欧美/复古/甜美/波西米亚/商务/运动/朋克/学院/少女/优雅

# 规则：
1. 若图片中有多件衣物，识别最突出、占比最大的一件
2. 若无法判断，category 填"无法识别"，confidence 填 0
3. confidence < 0.7 时，在 reason 中说明不确定的原因
4. 颜色判断以主体颜色为准，忽略印花/图案的次要颜色
5. 材质判断依据图片纹理、光泽、垂坠感等视觉特征
6. season_suitability 判断该衣物适合的季节：春/夏/秋/冬/四季通用

只返回 JSON，不要其他任何文字。"""

GARMENT_RECOGNITION_USER = """请分析这张图片中的衣物。

返回格式：
{
  "category": "上衣",
  "primary_color": "白",
  "secondary_colors": [],
  "material": "棉",
  "style_tags": ["简约", "韩系"],
  "confidence": 0.92,
  "reason": "图片主体为一件白色衬衫，翻领设计，棉质面料，风格简约",
  "season_suitability": "四季通用"
}"""
```

### 5.4 核心实现

[services/garment\_recognizer.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/garment_recognizer.py)

```python
import json
import time
from typing import Optional
from loguru import logger

from models.vision_model import VisionModel
from prompts.garment_recognition import (
    GARMENT_RECOGNITION_SYSTEM,
    GARMENT_RECOGNITION_USER,
)
from utils.response_parser import parse_json_response, validate_enum
from utils.image_utils import preprocess_image
from utils.proto_mapper import proto_to_garment_result, garment_result_to_proto

# 枚举校验映射
VALID_CATEGORIES = {
    "上衣", "裤装", "裙装", "连衣裙", "外套", "鞋履", "配饰", "无法识别"
}
VALID_COLORS = {
    "黑", "白", "灰", "红", "蓝", "绿", "黄", "紫", "粉", "棕",
    "卡其", "牛仔蓝", "橙", "米色", "驼色", "酒红", "藏青", "军绿", "多色"
}
VALID_MATERIALS = {
    "棉", "麻", "真丝", "羊毛", "羊绒", "皮革", "牛仔", "涤纶", "尼龙",
    "针织", "雪纺", "丝绒", "蕾丝", "毛衣", "羽绒", "皮草", "合成材料"
}
VALID_STYLES = {
    "简约", "街头", "日系", "韩系", "欧美", "复古", "甜美",
    "波西米亚", "商务", "运动", "朋克", "学院", "少女", "优雅"
}
VALID_SEASONS = {"春", "夏", "秋", "冬", "四季通用"}


class GarmentRecognizer:
    """衣物识别服务"""

    def __init__(self, vision_model: VisionModel):
        self.model = vision_model

    def recognize(self, image_url: Optional[str] = None,
                  image_data: Optional[bytes] = None,
                  image_format: str = "jpeg") -> dict:
        """
        识别衣物属性

        Args:
            image_url: 图片 URL
            image_data: 图片二进制数据
            image_format: 图片格式

        Returns:
            {
                "success": bool,
                "garment": { ... },
                "error_message": str,
                "processing_time_ms": int
            }
        """
        start_time = time.time()

        try:
            # 1. 图片预处理
            if image_data:
                image_data = preprocess_image(image_data, max_dimension=2048)
                # 转 Base64 用于 API 调用
                import base64
                image_b64 = base64.b64encode(image_data).decode("utf-8")
                image_uri = f"data:image/{image_format};base64,{image_b64}"
            elif image_url:
                image_uri = image_url
            else:
                return {"success": False, "error_message": "未提供图片"}

            # 2. 调用视觉模型
            raw_response = self.model.chat(
                system_prompt=GARMENT_RECOGNITION_SYSTEM,
                user_prompt=GARMENT_RECOGNITION_USER,
                images=[image_uri],
            )

            # 3. 解析 JSON 响应
            parsed = parse_json_response(raw_response)

            if not parsed:
                return {
                    "success": False,
                    "error_message": "模型返回无法解析",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                }

            # 4. 校验枚举值
            validated = self._validate_result(parsed)

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Garment recognition done in {elapsed_ms}ms: "
                        f"category={validated.get('category')}, "
                        f"confidence={validated.get('confidence')}")

            return {
                "success": True,
                "garment": validated,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Garment recognition failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
                "processing_time_ms": elapsed_ms,
            }

    def _validate_result(self, raw: dict) -> dict:
        """校验并修正识别结果，确保枚举值合法"""
        return {
            "category": raw.get("category", "无法识别")
                       if raw.get("category") in VALID_CATEGORIES else "无法识别",
            "primary_color": raw.get("primary_color", "多色")
                             if raw.get("primary_color") in VALID_COLORS else "多色",
            "secondary_colors": [
                c for c in raw.get("secondary_colors", [])
                if c in VALID_COLORS
            ],
            "material": raw.get("material", "合成材料")
                        if raw.get("material") in VALID_MATERIALS else "合成材料",
            "style_tags": [
                s for s in raw.get("style_tags", [])
                if s in VALID_STYLES
            ],
            "confidence": float(raw.get("confidence", 0)),
            "reason": raw.get("reason", ""),
            "season_suitability": raw.get("season_suitability", "四季通用")
                                  if raw.get("season_suitability") in VALID_SEASONS
                                  else "四季通用",
            "is_manually_edited": False,
        }
```

### 5.5 降级策略

```python
# 在 services/garment_recognizer.py 中

FALLBACK_RESULT = {
    "category": "无法识别",
    "primary_color": "多色",
    "secondary_colors": [],
    "material": "合成材料",
    "style_tags": [],
    "confidence": 0.0,
    "reason": "AI 识别服务不可用，请手动选择",
    "season_suitability": "四季通用",
    "is_manually_edited": False,
}

def recognize_with_fallback(self, **kwargs) -> dict:
    try:
        result = self.recognize(**kwargs)
        if result["success"]:
            return result
    except Exception as e:
        logger.warning(f"Recognition failed, using fallback: {e}")

    return {
        "success": True,  # 返回成功但标记低置信度，由前端展示手动选择界面
        "garment": FALLBACK_RESULT,
        "processing_time_ms": 0,
    }
```

***

## 6. 模块二：风格拆解（Style Decomposition）

### 6.1 功能描述

接收穿搭照片，调用 `qwen-vl-max`（最强视觉推理），拆解出色彩方案、廓形、层次搭配、关键单品、整体风格。

### 6.2 Prompt 模板

[prompts/style\_decomposition.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/style_decomposition.py)

```python
STYLE_DECOMPOSITION_SYSTEM = """你是专业的时尚造型分析师。请分析图片中的穿搭，拆解其风格要素。

# 分析维度：

1. 色彩方案（color_scheme）：
   - dominant_color: 画面中最突出的颜色
   - accent_colors: 辅助色（最多 3 个）
   - accent_highlight: 点缀色（面积最小但最亮眼的颜色）
   - palette_description: 一句话描述色彩感觉
   - color_harmony: 配色类型（同色系/邻近色/对比色/互补色）

2. 廓形（silhouette）：
   - H型：直筒，上下同宽
   - A型：上窄下宽
   - X型：收腰，突出曲线
   - O型：茧型，中部宽松
   - Y型：上宽下窄
   - S型：修身曲线

3. 层次搭配（layering）：
   - description: 整体层次描述
   - layers: 各层说明，如 ["内层：白色打底衫", "中层：条纹衬衫", "外层：卡其色风衣"]
   - layering_type: 叠穿方式（内长外短/外长内短/同长/不规则）

4. 关键单品（key_items）：
   - 识别每件关键单品，填写品类、颜色、材质、风格
   - 最多识别 5 件

5. 整体风格（overall_style）：
   - 可选值：简约/街头/日系/韩系/欧美/复古/甜美/波西米亚/商务/运动/朋克/学院/少女/优雅

6. 配饰策略（accessory_tips）：
   - 列出图片中穿搭用到的配饰技巧

7. style_summary：一句话总结这个穿搭风格
8. confidence：整体拆解置信度 0.0-1.0

只返回 JSON，不要其他文字。"""

STYLE_DECOMPOSITION_USER = """请分析这张穿搭照片的风格要素。

返回格式：
{
  "color_scheme": {
    "dominant_color": "卡其",
    "accent_colors": ["白", "蓝"],
    "accent_highlight": "棕",
    "palette_description": "温润的大地色系搭配清爽的蓝白，稳重又不失活力",
    "color_harmony": "邻近色"
  },
  "silhouette": "H型",
  "layering": {
    "description": "三层叠穿，内白外卡其，层次分明",
    "layers": ["内层：白色圆领T恤", "中层：蓝色条纹衬衫", "外层：卡其色风衣"],
    "layering_type": "外长内短"
  },
  "key_items": [
    {
      "category": "外套",
      "primary_color": "卡其",
      "secondary_colors": [],
      "material": "棉",
      "style_tags": ["简约", "韩系"],
      "confidence": 0.93,
      "reason": "经典卡其色风衣，双排扣设计"
    },
    {
      "category": "上衣",
      "primary_color": "蓝",
      "secondary_colors": ["白"],
      "material": "棉",
      "style_tags": ["简约", "休闲"],
      "confidence": 0.88,
      "reason": "蓝色条纹衬衫，内搭白色T恤"
    }
  ],
  "overall_style": ["韩系", "简约", "优雅"],
  "style_summary": "韩系简约都市风，卡其风衣+蓝白叠穿，干练清爽",
  "accessory_tips": ["手腕处露出手表", "整体风格简洁，配饰不宜过多"],
  "confidence": 0.90
}"""
```

### 6.3 核心实现

[services/style\_decomposer.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/style_decomposer.py)

```python
import time
from loguru import logger

from models.vision_model import VisionModel
from prompts.style_decomposition import (
    STYLE_DECOMPOSITION_SYSTEM,
    STYLE_DECOMPOSITION_USER,
)
from utils.response_parser import parse_json_response


class StyleDecomposer:
    """风格拆解服务"""

    def __init__(self, vision_model: VisionModel):
        self.model = vision_model  # 使用 qwen-vl-max

    def decompose(self, image_url: str = None,
                  image_data: bytes = None,
                  focus_areas: list[str] = None) -> dict:
        """
        拆解穿搭风格要素

        Args:
            image_url: 穿搭照片 URL
            image_data: 穿搭照片二进制
            focus_areas: 用户关注的维度

        Returns:
            {
                "success": bool,
                "decomposition": StyleDecomposition,
                "error_message": str,
                "processing_time_ms": int
            }
        """
        start_time = time.time()

        try:
            # 构建用户关注维度提示
            user_prompt = STYLE_DECOMPOSITION_USER
            if focus_areas and "all" not in focus_areas:
                user_prompt += f"\n\n请重点关注以下维度：{'、'.join(focus_areas)}"

            # 准备图片
            if image_data:
                import base64
                image_b64 = base64.b64encode(image_data).decode("utf-8")
                image_uri = f"data:image/jpeg;base64,{image_b64}"
            else:
                image_uri = image_url

            raw_response = self.model.chat(
                system_prompt=STYLE_DECOMPOSITION_SYSTEM,
                user_prompt=user_prompt,
                images=[image_uri],
            )

            parsed = parse_json_response(raw_response)
            if not parsed:
                return {
                    "success": False,
                    "error_message": "模型返回无法解析",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                }

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Style decomposition done in {elapsed_ms}ms")

            return {
                "success": True,
                "decomposition": parsed,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Style decomposition failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
                "processing_time_ms": elapsed_ms,
            }
```

***

## 7. 模块三：风格匹配穿搭（Style Matching）

### 7.1 功能描述

接收风格拆解结果 + 用户衣橱，调用 `qwen-plus` 文本模型，将风格要素映射到衣橱单品，生成模仿穿搭方案。

### 7.2 核心逻辑

[services/style\_matcher.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/style_matcher.py)

```python
import json
import time
from loguru import logger

from models.text_model import TextModel
from prompts.outfit_recommendation import STYLE_MATCH_SYSTEM, STYLE_MATCH_USER
from utils.response_parser import parse_json_response


class StyleMatcher:
    """风格匹配穿搭服务"""

    def __init__(self, text_model: TextModel):
        self.model = text_model

    def match(self, user_id: str,
              target_style: dict,
              wardrobe: list[dict],
              min_match_score: float = 0.5) -> dict:
        """
        匹配风格到衣橱

        Args:
            user_id: 用户 ID
            target_style: 目标风格拆解结果
            wardrobe: 用户衣橱单品列表
            min_match_score: 最低匹配分阈值

        Returns:
            {
                "success": bool,
                "results": [
                    {
                        "matched_garment_ids": [...],
                        "match_score": 0.85,
                        "missing_categories": [...],
                        "purchase_suggestions": [...],
                        "match_reason": "..."
                    }
                ],
                "processing_time_ms": int
            }
        """
        start_time = time.time()

        try:
            # 构建衣橱文本描述
            wardrobe_text = self._format_wardrobe(wardrobe)

            # 构建风格描述
            style_text = json.dumps(target_style, ensure_ascii=False, indent=2)

            raw_response = self.model.chat(
                system_prompt=STYLE_MATCH_SYSTEM,
                user_prompt=STYLE_MATCH_USER.format(
                    style=style_text,
                    wardrobe=wardrobe_text,
                    min_score=min_match_score,
                ),
            )

            parsed = parse_json_response(raw_response)
            if not parsed:
                return {
                    "success": False,
                    "error_message": "模型返回无法解析",
                }

            elapsed_ms = int((time.time() - start_time) * 1000)
            return {
                "success": True,
                "results": parsed.get("matches", []),
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            logger.error(f"Style matching failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
            }

    def _format_wardrobe(self, wardrobe: list[dict]) -> str:
        """将衣橱格式化为可读文本"""
        lines = []
        for item in wardrobe:
            lines.append(
                f"- ID={item['garment_id']} | "
                f"品类={item['category']} | "
                f"主色={item['primary_color']} | "
                f"风格={','.join(item.get('style_tags', []))}"
            )
        return "\n".join(lines)
```

### 7.3 Prompt 模板

```python
STYLE_MATCH_SYSTEM = """你是专业的穿搭顾问。根据目标风格拆解结果和用户衣橱清单，进行风格匹配。

# 匹配规则：
1. 按品类匹配：目标风格中每个关键单品，在衣橱中找最相似的单品
2. 颜色相似度：优先匹配同色系或邻近色
3. 风格一致性：优先匹配相同风格标签的单品
4. 材质考量：季节和材质要匹配

# 输出格式：
{
  "matches": [
    {
      "matched_garment_ids": ["id1", "id2", "id3"],
      "match_score": 0.85,
      "missing_categories": ["裙装"],
      "purchase_suggestions": ["建议添置一条黑色A字半裙"],
      "match_reason": "衣橱中的白衬衫、黑西裤、乐福鞋可还原目标风格的80%"
    }
  ]
}

只返回 JSON，不要其他文字。"""

STYLE_MATCH_USER = """目标风格拆解：
{style}

用户衣橱：
{wardrobe}

请匹配，最低匹配分 {min_score}。"""
```

***

## 8. 模块四：穿搭推荐（Outfit Recommendation）

### 8.1 功能描述

接收天气 + 场合 + 用户衣橱，调用 `qwen-max` 文本模型，结合穿搭规则库，生成 1-3 套穿搭方案。

### 8.2 核心实现

[services/outfit\_recommender.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/outfit_recommender.py)

```python
import json
import time
import uuid
from loguru import logger

from models.text_model import TextModel
from prompts.outfit_recommendation import (
    OUTFIT_RECOMMEND_SYSTEM,
    OUTFIT_RECOMMEND_USER,
)
from utils.response_parser import parse_json_response


class OutfitRecommender:
    """穿搭推荐服务"""

    def __init__(self, text_model: TextModel):
        self.model = text_model  # 使用 qwen-max

    def recommend(self, user_id: str,
                  weather: dict,
                  occasion: str,
                  wardrobe: list[dict],
                  user_preferences: list[str] = None,
                  max_outfits: int = 3,
                  avoid_garment_ids: list[str] = None,
                  avoid_colors: list[str] = None,
                  avoid_categories: list[str] = None) -> dict:
        """
        生成穿搭推荐

        Args:
            user_id: 用户 ID
            weather: 天气信息 {temperature, condition, humidity, wind_speed, uv_index, season}
            occasion: 场合 (commute/casual/date/sport/formal)
            wardrobe: 用户衣橱
            user_preferences: 用户风格偏好标签
            max_outfits: 最大推荐套数
            avoid_garment_ids: 排除的单品
            avoid_colors: 排除的颜色
            avoid_categories: 排除的品类

        Returns:
            {
                "success": bool,
                "outfits": [Outfit, ...],
                "processing_time_ms": int
            }
        """
        start_time = time.time()

        try:
            # 1. 前置检查：衣橱至少 5 件
            if len(wardrobe) < 5:
                return {
                    "success": False,
                    "error_message": f"衣柜仅 {len(wardrobe)} 件，至少需要 5 件衣物才能生成推荐",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                }

            # 2. 应用规则引擎预过滤
            filtered = self._apply_rules(
                wardrobe, weather, occasion,
                avoid_garment_ids or [], avoid_colors or [], avoid_categories or []
            )

            if not filtered:
                return {
                    "success": False,
                    "error_message": "当前衣物无法组合，请添加更多品类",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                }

            # 3. 构建 LLM Prompt
            wardrobe_text = self._format_wardrobe(filtered)
            weather_text = self._format_weather(weather)

            raw_response = self.model.chat(
                system_prompt=OUTFIT_RECOMMEND_SYSTEM,
                user_prompt=OUTFIT_RECOMMEND_USER.format(
                    weather=weather_text,
                    occasion=occasion,
                    preferences="、".join(user_preferences) if user_preferences else "无特殊偏好",
                    wardrobe=wardrobe_text,
                    max_outfits=max_outfits,
                ),
            )

            parsed = parse_json_response(raw_response)
            if not parsed:
                return {
                    "success": False,
                    "error_message": "模型返回无法解析",
                }

            # 4. 为每套方案生成 outfit_id
            outfits = parsed.get("outfits", [])
            for outfit in outfits:
                outfit["outfit_id"] = str(uuid.uuid4())

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Outfit recommendation done in {elapsed_ms}ms: "
                        f"{len(outfits)} outfits generated")

            return {
                "success": True,
                "outfits": outfits,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            logger.error(f"Outfit recommendation failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
            }

    def _apply_rules(self, wardrobe, weather, occasion,
                     avoid_ids, avoid_colors, avoid_categories):
        """应用规则引擎预过滤"""
        temp = weather.get("temperature", 20)
        season = weather.get("season", "spring")

        filtered = []
        for item in wardrobe:
            # 排除指定单品
            if item["garment_id"] in avoid_ids:
                continue
            # 排除指定颜色
            if item["primary_color"] in avoid_colors:
                continue
            # 排除指定品类
            if item["category"] in avoid_categories:
                continue

            filtered.append(item)

        # 温度过滤
        if temp > 25:
            # 不需要厚外套/羽绒服
            filtered = [i for i in filtered
                        if not (i["category"] == "外套" and
                                i.get("material") in ("羽绒", "羊毛", "皮草"))]
        elif temp < 10:
            # 需要外套，排除过薄单品
            pass  # 保留所有，由 LLM 判断

        return filtered

    def _format_weather(self, weather: dict) -> str:
        return (
            f"温度：{weather.get('temperature', 20)}°C，"
            f"天气：{weather.get('condition', '晴')}，"
            f"湿度：{weather.get('humidity', 50)}%，"
            f"风速：{weather.get('wind_speed', 0)}级，"
            f"紫外线指数：{weather.get('uv_index', 0)}，"
            f"季节：{weather.get('season', 'spring')}"
        )

    def _format_wardrobe(self, wardrobe: list[dict]) -> str:
        lines = []
        for item in wardrobe:
            lines.append(
                f"- ID={item['garment_id']} | "
                f"品类={item['category']} | "
                f"主色={item['primary_color']} | "
                f"材质={item.get('material', '未知')} | "
                f"风格={','.join(item.get('style_tags', []))}"
            )
        return "\n".join(lines)
```

### 8.3 Prompt 模板

```python
OUTFIT_RECOMMEND_SYSTEM = """你是专业的穿搭顾问。根据天气、场合和用户衣橱，生成穿搭方案。

# 穿搭原则：
1. 温度适应：<10°C需外套，10-25°C可选薄外套，>25°C不需要外套
2. 场合匹配：
   - 通勤：衬衫/针织衫+西裤/直筒裤+皮鞋/乐福鞋，偏正式利落
   - 休闲：T恤/卫衣+牛仔裤/休闲裤+运动鞋/板鞋，舒适自由
   - 约会：连衣裙/Blouse+半裙/阔腿裤+高跟鞋/短靴，精致优雅
   - 运动：T恤/运动背心+运动裤+运动鞋，注重功能性
   - 正装：西装+衬衫+西裤+皮鞋，正式得体
3. 颜色搭配：避免冲突色，优先同色系/邻近色/中性色搭配
4. 每套方案包含 3-5 件单品（上衣+下装+鞋履必须，外套+配饰可选）
5. 为每套方案提供 2-3 条实用的穿搭 Tips

# 输出格式：
{
  "outfits": [
    {
      "items": [
        {"garment_id": "id1", "category": "上衣", "note": "白色衬衫，百搭基础款"},
        {"garment_id": "id2", "category": "裤装", "note": "黑色西裤，修饰腿型"},
        {"garment_id": "id3", "category": "鞋履", "note": "棕色乐福鞋，通勤舒适"}
      ],
      "reason": "今日22°C晴天，通勤场合建议清爽干练风格",
      "tips": ["可将衬衫塞进裤腰，提升利落感", "建议搭配简约手表或皮带"],
      "score": 0.92,
      "weather_adaptation": "22°C适宜：衬衫单穿即可，无需外套",
      "occasion_adaptation": "通勤：白衬衫+黑西裤是经典职场搭配"
    }
  ]
}

只返回 JSON，不要其他文字。"""

OUTFIT_RECOMMEND_USER = """天气信息：
{weather}

场合：{occasion}
用户风格偏好：{preferences}

用户衣橱：
{wardrobe}

请生成 {max_outfits} 套穿搭方案。"""
```

***

## 9. 模块五：虚拟试穿（Virtual Try-On）

### 9.1 功能描述

接收用户体型信息 + 穿搭单品列表，调用 `qwen-image-plus` 图像生成模型，通过精心构造的 Prompt 生成虚拟试穿效果图。由于百炼暂未提供专门的虚拟试穿 API，采用 **Prompt 工程 + 文生图** 方案实现。

### 9.2 实现策略

**方案 A（当前）**：文生图 Prompt 拼接

- 将用户体型描述 + 每件单品描述 + 姿态/背景 拼接为详细 Prompt
- 调用 `qwen-image-plus` 生成

**方案 B（未来）**：如果百炼推出虚拟试穿专用 API，切换到专用接口

### 9.3 核心实现

[services/tryon\_generator.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/tryon_generator.py)

```python
import time
import uuid
import threading
from loguru import logger

from models.image_gen_model import ImageGenModel
from prompts.tryon_prompt import build_tryon_prompt
from services.task_manager import TaskManager


class TryOnGenerator:
    """虚拟试穿生成服务（异步）"""

    def __init__(self, image_gen_model: ImageGenModel, task_manager: TaskManager):
        self.model = image_gen_model
        self.task_manager = task_manager

    def generate_async(self, user_body: dict,
                       outfit_items: list[dict],
                       pose: str = "standing",
                       background: str = "studio",
                       num_images: int = 1,
                       image_size: str = "1024x1024") -> str:
        """
        异步生成虚拟试穿效果图

        Args:
            user_body: 用户体型信息
            outfit_items: 穿搭单品列表
            pose: 姿态
            background: 背景
            num_images: 生成数量
            image_size: 图片尺寸

        Returns:
            task_id: 异步任务 ID
        """
        task_id = str(uuid.uuid4())
        self.task_manager.create_task(task_id, "pending")

        # 异步执行
        thread = threading.Thread(
            target=self._run_generation,
            args=(task_id, user_body, outfit_items,
                  pose, background, num_images, image_size),
            daemon=True,
        )
        thread.start()

        return task_id

    def _run_generation(self, task_id, user_body, outfit_items,
                        pose, background, num_images, image_size):
        """后台执行生成任务"""
        self.task_manager.update_task(task_id, "processing")

        try:
            # 构建 Prompt
            prompt = build_tryon_prompt(user_body, outfit_items, pose, background)

            logger.info(f"Try-on prompt (first 200 chars): {prompt[:200]}")

            # 调用图像生成 API
            result = self.model.generate(
                prompt=prompt,
                size=image_size,
                n=num_images,
            )

            # 提取图片 URLs
            image_urls = [img.get("url", "") for img in result.get("data", [])]

            self.task_manager.update_task(task_id, "done", {
                "success": True,
                "result_image_urls": image_urls,
                "processing_time_ms": 0,
            })

        except Exception as e:
            logger.error(f"Try-on generation failed: {e}")
            self.task_manager.update_task(task_id, "failed", {
                "success": False,
                "error_message": str(e),
            })
```

### 9.4 Prompt 构建器

[prompts/tryon\_prompt.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/prompts/tryon_prompt.py)

```python
def build_tryon_prompt(user_body: dict, outfit_items: list[dict],
                       pose: str, background: str) -> str:
    """构建虚拟试穿 Prompt"""

    # 用户体型
    gender = user_body.get("gender", "female")
    body_type = user_body.get("body_type", "standard")
    height = user_body.get("height", 165)
    skin_tone = user_body.get("skin_tone", "medium")

    gender_text = "女性" if gender == "female" else "男性"
    body_desc = {
        "slim": "苗条身材",
        "standard": "标准身材",
        "athletic": "运动型身材",
        "curvy": "丰满身材",
        "plus": "偏胖身材",
    }.get(body_type, "标准身材")

    # 姿态
    pose_desc = {
        "standing": "正面站立，双手自然下垂",
        "walking": "行走姿态，动态自然",
        "sitting": "优雅坐姿",
        "front": "正面站立，全身照",
    }.get(pose, "正面站立，全身照")

    # 背景
    bg_desc = {
        "studio": "纯色摄影棚背景，专业灯光",
        "outdoor": "户外自然光线，城市街景",
        "urban": "都市街道背景，时尚街拍风格",
        "indoor": "室内温馨环境，自然光线",
    }.get(background, "纯色摄影棚背景，专业灯光")

    # 单品描述
    items_desc = []
    for item in outfit_items:
        items_desc.append(
            f"{item.get('category', '')}：{item.get('note', '')}"
        )

    prompt = (
        f"一位{gender_text}，{body_desc}，身高约{height}cm，{skin_tone}肤色，"
        f"{pose_desc}。"
        f"穿着：{'，'.join(items_desc)}。"
        f"{bg_desc}。"
        f"高质量时尚摄影，全身构图，服装细节清晰，"
        f"真实面料质感，自然光线，8K分辨率。"
        f"不要出现任何文字、水印、logo。"
    )

    return prompt
```

***

## 10. 模块六：穿搭 Tips 生成

### 10.1 功能描述

支持两种模式：**模板模式**（快速，零成本）和 **AI 模式**（个性化，调用 `qwen-plus`）。

### 10.2 核心实现

[services/tips\_generator.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/tips_generator.py)

```python
import random
import time
from loguru import logger

from models.text_model import TextModel
from utils.response_parser import parse_json_response

# 预设 Tips 模板库（按场合分类）
TIPS_TEMPLATES = {
    "commute": [
        "可将衬衫塞进裤腰，提升整体利落感",
        "建议搭配简约手表或皮带作为点缀",
        "选择同色系包袋，避免颜色过于跳跃",
        "裤脚刚好盖住鞋面 1-2cm 最为得体",
        "可加一件轻薄西装外套，方便室内外温差",
    ],
    "casual": [
        "卷起袖口，增加随意感",
        "搭配棒球帽或帆布包，强化休闲氛围",
        "整体色调控制在 3 色以内，更显清爽",
        "选择舒适的运动鞋或板鞋，走一天也不累",
        "可叠戴简约项链或手链，增加细节感",
    ],
    "date": [
        "选择一处配饰作为视觉焦点，不宜过多",
        "适当露肤（手腕/锁骨/脚踝）可增加精致感",
        "高跟鞋选 3-5cm 最为舒适且有气质",
        "搭配精致小包，提升约会仪式感",
        "整体色调柔和，避免过于张扬的颜色",
    ],
    "sport": [
        "选择速干面料，运动时保持干爽",
        "运动鞋选大半码，避免长时间运动挤压脚趾",
        "亮色单品可增加运动时的可见度和安全性",
        "搭配运动腰包，解放双手",
        "运动内衣选支撑性好的款式",
    ],
    "formal": [
        "西装扣子法则：最后一颗永远不扣",
        "领带宽度与西装驳领宽度协调",
        "口袋巾与领带颜色呼应，不宜完全相同",
        "袖口露出衬衫 1-1.5cm 最为标准",
        "袜子颜色与裤子颜色一致，拉长腿部线条",
    ],
}


class TipsGenerator:
    """穿搭 Tips 生成服务"""

    def __init__(self, text_model: TextModel = None):
        self.model = text_model  # 可选，用于 AI 模式

    def generate(self, outfit: dict, weather: dict,
                 occasion: str, max_tips: int = 5,
                 use_ai: bool = False) -> dict:
        """
        生成穿搭 Tips

        Args:
            outfit: 穿搭方案
            weather: 天气信息
            occasion: 场合
            max_tips: 最大 Tips 数
            use_ai: 是否使用 AI 生成

        Returns:
            {"success": bool, "tips": [...], "processing_time_ms": int}
        """
        start_time = time.time()

        try:
            if not use_ai:
                tips = self._template_tips(occasion, outfit, weather, max_tips)
            else:
                tips = self._ai_tips(outfit, weather, occasion, max_tips)

            elapsed_ms = int((time.time() - start_time) * 1000)
            return {
                "success": True,
                "tips": tips,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            logger.error(f"Tips generation failed: {e}")
            # 降级为模板
            tips = self._template_tips(occasion, outfit, weather, max_tips)
            return {
                "success": True,
                "tips": tips,
                "processing_time_ms": 0,
            }

    def _template_tips(self, occasion: str, outfit: dict,
                       weather: dict, max_tips: int) -> list[str]:
        """基于模板库生成 Tips"""
        templates = TIPS_TEMPLATES.get(occasion, TIPS_TEMPLATES["casual"])

        # 天气相关 Tips
        temp = weather.get("temperature", 20)
        if temp < 10:
            templates = templates + ["气温较低，注意保暖，可加围巾和手套"]
        elif temp > 30:
            templates = templates + ["高温天气，选择透气面料，注意防晒"]

        # 随机抽取
        selected = random.sample(templates, min(max_tips, len(templates)))
        return selected

    def _ai_tips(self, outfit: dict, weather: dict,
                 occasion: str, max_tips: int) -> list[str]:
        """基于 AI 生成个性化 Tips"""
        if not self.model:
            return self._template_tips(occasion, outfit, weather, max_tips)

        system_prompt = """你是专业的穿搭顾问。根据穿搭方案和天气，生成实用的穿搭 Tips。
每条 Tips 必须具体、可执行，避免空泛的建议。
只返回 JSON 数组，不要其他文字。"""

        items_text = ", ".join([
            f"{item.get('category', '')}({item.get('note', '')})"
            for item in outfit.get("items", [])
        ])

        user_prompt = (
            f"穿搭方案：{items_text}\n"
            f"场合：{occasion}\n"
            f"天气：{weather.get('temperature', 20)}°C {weather.get('condition', '晴')}\n"
            f"请生成 {max_tips} 条穿搭 Tips。"
        )

        raw = self.model.chat(system_prompt=system_prompt, user_prompt=user_prompt)
        parsed = parse_json_response(raw)

        if isinstance(parsed, list):
            return parsed[:max_tips]
        return self._template_tips(occasion, outfit, weather, max_tips)
```

***

## 11. 模块七：衣物抠图

### 11.1 功能描述

使用 `rembg` 库进行本地抠图，移除背景，输出透明 PNG。不依赖云端 API，兼顾速度和成本。

### 11.2 核心实现

[services/bg\_remover.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/bg_remover.py)

```python
import io
import time
from PIL import Image
from loguru import logger

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False


class BackgroundRemover:
    """衣物抠图服务"""

    def remove(self, image_data: bytes) -> dict:
        """
        移除图片背景

        Args:
            image_data: 原始图片二进制

        Returns:
            {"success": bool, "result_image": bytes, "error_message": str}
        """
        start_time = time.time()

        if not REMBG_AVAILABLE:
            return {
                "success": False,
                "error_message": "rembg not installed, run: pip install rembg",
                "processing_time_ms": int((time.time() - start_time) * 1000),
            }

        try:
            input_image = Image.open(io.BytesIO(image_data))

            # 抠图
            output_image = remove(input_image)

            # 输出 PNG
            buf = io.BytesIO()
            output_image.save(buf, format="PNG")
            result_bytes = buf.getvalue()

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Background removed in {elapsed_ms}ms")

            return {
                "success": True,
                "result_image": result_bytes,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            return {
                "success": False,
                "error_message": str(e),
                "processing_time_ms": int((time.time() - start_time) * 1000),
            }
```

***

## 12. gRPC 服务端实现

### 12.1 服务入口

[server.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/server.py)

```python
import grpc
from concurrent import futures
from loguru import logger

from config.settings import settings
from models.dashscope_client import DashScopeClient
from models.vision_model import VisionModel
from models.text_model import TextModel
from models.image_gen_model import ImageGenModel
from services.garment_recognizer import GarmentRecognizer
from services.style_decomposer import StyleDecomposer
from services.style_matcher import StyleMatcher
from services.outfit_recommender import OutfitRecommender
from services.tryon_generator import TryOnGenerator
from services.tips_generator import TipsGenerator
from services.bg_remover import BackgroundRemover
from services.task_manager import TaskManager
from proto import ai_service_pb2
from proto import ai_service_pb2_grpc


class AIServiceServicer(ai_service_pb2_grpc.AIServiceServicer):
    """gRPC AI 服务实现"""

    def __init__(self):
        # 初始化 DashScope 客户端
        client = DashScopeClient(
            api_key=settings.dashscope_api_key,
            base_url=settings.dashscope_base_url,
            timeout=settings.request_timeout,
            max_retries=settings.max_retries,
        )

        # 初始化模型
        vision = VisionModel(client, model_name=settings.vision_model)
        vision_max = VisionModel(client, model_name=settings.vision_model_max)
        text = TextModel(client, model_name=settings.text_model)
        text_max = TextModel(client, model_name=settings.text_model_max)
        image_gen = ImageGenModel(client, model_name=settings.image_gen_model)

        # 初始化任务管理器
        self.task_manager = TaskManager(ttl=settings.tryon_task_ttl)

        # 初始化服务
        self.garment_recognizer = GarmentRecognizer(vision)
        self.style_decomposer = StyleDecomposer(vision_max)
        self.style_matcher = StyleMatcher(text)
        self.outfit_recommender = OutfitRecommender(text_max)
        self.tryon_generator = TryOnGenerator(image_gen, self.task_manager)
        self.tips_generator = TipsGenerator(text)
        self.bg_remover = BackgroundRemover()

    # --- 1. 衣物识别 ---
    def RecognizeGarment(self, request, context):
        logger.info(f"RecognizeGarment: request_id={request.request_id}")

        image_url = request.image.url if request.image.url else None
        image_data = request.image.data if request.image.data else None
        image_format = request.image.format or "jpeg"

        result = self.garment_recognizer.recognize(
            image_url=image_url,
            image_data=image_data,
            image_format=image_format,
        )

        return self._build_recognize_response(request.request_id, result)

    # --- 2. 风格拆解 ---
    def DecomposeStyle(self, request, context):
        logger.info(f"DecomposeStyle: request_id={request.request_id}")

        result = self.style_decomposer.decompose(
            image_url=request.image.url or None,
            image_data=request.image.data or None,
            focus_areas=list(request.focus_areas),
        )

        return self._build_decompose_response(request.request_id, result)

    # --- 3. 风格匹配 ---
    def MatchStyle(self, request, context):
        logger.info(f"MatchStyle: request_id={request.request_id}")

        # 转换 WardrobeItem proto → dict
        wardrobe = [self._wardrobe_item_to_dict(item) for item in request.wardrobe]
        target_style = self._style_decomp_to_dict(request.target_style)

        result = self.style_matcher.match(
            user_id=request.user_id,
            target_style=target_style,
            wardrobe=wardrobe,
            min_match_score=request.min_match_score,
        )

        return self._build_match_response(request.request_id, result)

    # --- 4. 穿搭推荐 ---
    def RecommendOutfit(self, request, context):
        logger.info(f"RecommendOutfit: request_id={request.request_id}")

        wardrobe = [self._wardrobe_item_to_dict(item) for item in request.wardrobe]
        weather = {
            "temperature": request.weather.temperature,
            "condition": request.weather.condition,
            "humidity": request.weather.humidity,
            "wind_speed": request.weather.wind_speed,
            "uv_index": request.weather.uv_index,
            "season": request.weather.season,
        }
        occasion = ai_service_pb2.Occasion.Name(request.occasion)
        occasion = occasion.replace("OCCASION_", "").lower()

        result = self.outfit_recommender.recommend(
            user_id=request.user_id,
            weather=weather,
            occasion=occasion,
            wardrobe=wardrobe,
            user_preferences=list(request.user_preferences),
            max_outfits=request.max_outfits or 3,
            avoid_garment_ids=list(request.avoid_garment_ids),
            avoid_colors=list(request.avoid_colors),
            avoid_categories=list(request.avoid_categories),
        )

        return self._build_recommend_response(request.request_id, result)

    # --- 5. 虚拟试穿 ---
    def GenerateTryOn(self, request, context):
        logger.info(f"GenerateTryOn: request_id={request.request_id}")

        user_body = {
            "user_id": request.user_body.user_id,
            "height": request.user_body.height,
            "weight": request.user_body.weight,
            "body_type": request.user_body.body_type,
            "skin_tone": request.user_body.skin_tone,
            "gender": request.user_body.gender,
        }
        outfit_items = [
            {"garment_id": item.garment_id, "category": item.category, "note": item.note}
            for item in request.outfit_items
        ]

        task_id = self.tryon_generator.generate_async(
            user_body=user_body,
            outfit_items=outfit_items,
            pose=request.pose or "standing",
            background=request.background or "studio",
            num_images=request.num_images or 1,
            image_size=request.image_size or "1024x1024",
        )

        return ai_service_pb2.GenerateTryOnResponse(
            request_id=request.request_id,
            success=True,
            task_id=task_id,
        )

    # --- 6. 查询任务 ---
    def GetTaskStatus(self, request, context):
        task = self.task_manager.get_task(request.task_id)
        if not task:
            return ai_service_pb2.GetTaskStatusResponse(
                task_id=request.task_id,
                status="not_found",
                error_message="Task not found or expired",
            )

        response = ai_service_pb2.GetTaskStatusResponse(
            task_id=request.task_id,
            status=task["status"],
        )

        if task["status"] == "done":
            result = task.get("result", {})
            response.result.CopyFrom(
                ai_service_pb2.GenerateTryOnResponse(
                    success=result.get("success", False),
                    result_image_urls=result.get("result_image_urls", []),
                    processing_time_ms=result.get("processing_time_ms", 0),
                )
            )

        return response

    # --- 7. 穿搭 Tips ---
    def GenerateTips(self, request, context):
        logger.info(f"GenerateTips: request_id={request.request_id}")

        outfit = self._outfit_to_dict(request.outfit)
        weather = {
            "temperature": request.weather.temperature,
            "condition": request.weather.condition,
        }
        occasion = ai_service_pb2.Occasion.Name(request.occasion)
        occasion = occasion.replace("OCCASION_", "").lower()

        result = self.tips_generator.generate(
            outfit=outfit,
            weather=weather,
            occasion=occasion,
            max_tips=request.max_tips or 5,
            use_ai=request.use_ai,
        )

        return ai_service_pb2.GenerateTipsResponse(
            request_id=request.request_id,
            success=result["success"],
            tips=result.get("tips", []),
            processing_time_ms=result.get("processing_time_ms", 0),
        )

    # --- 8. 衣物抠图 ---
    def RemoveBackground(self, request, context):
        logger.info(f"RemoveBackground: request_id={request.request_id}")

        result = self.bg_remover.remove(request.image.data)

        return ai_service_pb2.RemoveBackgroundResponse(
            request_id=request.request_id,
            success=result["success"],
            result_image=result.get("result_image", b""),
            error_message=result.get("error_message", ""),
            processing_time_ms=result.get("processing_time_ms", 0),
        )

    # --- 9. 健康检查 ---
    def HealthCheck(self, request, context):
        return ai_service_pb2.HealthCheckResponse(
            status="ok",
            version="1.0.0",
            model_status={
                "vision": "available",
                "vision_max": "available",
                "text": "available",
                "text_max": "available",
                "image_gen": "available",
            },
        )

    # --- Proto ↔ Dict 转换辅助方法 ---
    def _wardrobe_item_to_dict(self, item):
        return {
            "garment_id": item.garment_id,
            "category": ai_service_pb2.GarmentCategory.Name(item.category),
            "primary_color": ai_service_pb2.Color.Name(item.primary_color),
            "secondary_colors": [ai_service_pb2.Color.Name(c) for c in item.secondary_colors],
            "material": ai_service_pb2.Material.Name(item.material),
            "style_tags": [ai_service_pb2.StyleTag.Name(s) for s in item.style_tags],
            "image_url": item.image_url,
        }

    def _style_decomp_to_dict(self, sd):
        return {
            "color_scheme": {
                "dominant_color": ai_service_pb2.Color.Name(sd.color_scheme.dominant_color),
                "accent_colors": [ai_service_pb2.Color.Name(c) for c in sd.color_scheme.accent_colors],
                "accent_highlight": ai_service_pb2.Color.Name(sd.color_scheme.accent_highlight),
                "palette_description": sd.color_scheme.palette_description,
                "color_harmony": sd.color_scheme.color_harmony,
            },
            "silhouette": ai_service_pb2.Silhouette.Name(sd.silhouette),
            "layering": {
                "description": sd.layering.description,
                "layers": list(sd.layering.layers),
                "layering_type": sd.layering.layering_type,
            },
            "key_items": [
                {
                    "category": ai_service_pb2.GarmentCategory.Name(ki.category),
                    "primary_color": ai_service_pb2.Color.Name(ki.primary_color),
                    "secondary_colors": [ai_service_pb2.Color.Name(c) for c in ki.secondary_colors],
                    "material": ai_service_pb2.Material.Name(ki.material),
                    "style_tags": [ai_service_pb2.StyleTag.Name(s) for s in ki.style_tags],
                    "confidence": ki.confidence,
                    "reason": ki.reason,
                }
                for ki in sd.key_items
            ],
            "overall_style": [ai_service_pb2.StyleTag.Name(s) for s in sd.overall_style],
            "style_summary": sd.style_summary,
            "accessory_tips": list(sd.accessory_tips),
            "confidence": sd.confidence,
        }

    def _outfit_to_dict(self, outfit):
        return {
            "outfit_id": outfit.outfit_id,
            "items": [
                {
                    "garment_id": item.garment_id,
                    "category": ai_service_pb2.GarmentCategory.Name(item.category),
                    "note": item.note,
                }
                for item in outfit.items
            ],
            "reason": outfit.reason,
            "tips": list(outfit.tips),
        }

    def _build_recognize_response(self, request_id, result):
        resp = ai_service_pb2.RecognizeGarmentResponse(
            request_id=request_id,
            success=result["success"],
            error_message=result.get("error_message", ""),
            processing_time_ms=result.get("processing_time_ms", 0),
        )
        if result["success"] and "garment" in result:
            g = result["garment"]
            resp.garment.CopyFrom(ai_service_pb2.RecognizedGarment(
                category=ai_service_pb2.GarmentCategory.Value(
                    f"GARMENT_CATEGORY_{g['category'].upper()}"
                ) if g.get("category") else 0,
                primary_color=ai_service_pb2.Color.Value(
                    f"COLOR_{g['primary_color'].upper()}"
                ) if g.get("primary_color") else 0,
                confidence=g.get("confidence", 0),
                reason=g.get("reason", ""),
                season_suitability=g.get("season_suitability", ""),
            ))
        return resp

    # ... (其他 _build_xxx_response 方法类似，为简洁省略)


def serve():
    """启动 gRPC 服务"""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=settings.grpc_max_workers)
    )
    ai_service_pb2_grpc.add_AIServiceServicer_to_server(
        AIServiceServicer(), server
    )
    server.add_insecure_port(f"{settings.grpc_host}:{settings.grpc_port}")
    server.start()

    logger.info(f"AI Engine gRPC server started on {settings.grpc_host}:{settings.grpc_port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
```

### 12.2 任务管理器

[services/task\_manager.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/services/task_manager.py)

```python
import time
import threading
from collections import OrderedDict


class TaskManager:
    """异步任务管理器（内存版，生产环境可换 Redis）"""

    def __init__(self, ttl: int = 3600):
        self.tasks = OrderedDict()
        self.ttl = ttl
        self.lock = threading.Lock()
        # 启动清理线程
        self._cleaner = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleaner.start()

    def create_task(self, task_id: str, status: str = "pending"):
        with self.lock:
            self.tasks[task_id] = {
                "task_id": task_id,
                "status": status,
                "result": None,
                "created_at": time.time(),
            }

    def update_task(self, task_id: str, status: str, result: dict = None):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id]["status"] = status
                self.tasks[task_id]["result"] = result

    def get_task(self, task_id: str) -> dict | None:
        with self.lock:
            return self.tasks.get(task_id)

    def _cleanup_loop(self):
        while True:
            time.sleep(60)  # 每分钟清理
            self._cleanup()

    def _cleanup(self):
        now = time.time()
        with self.lock:
            expired = [
                tid for tid, t in self.tasks.items()
                if now - t["created_at"] > self.ttl
            ]
            for tid in expired:
                del self.tasks[tid]
```

***

## 13. 部署与运维

### 13.1 Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（rembg 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

# 生成 gRPC 代码
RUN python -m grpc_tools.protoc \
    -I../proto \
    --python_out=./proto \
    --grpc_python_out=./proto \
    ../proto/ai_service.proto

# 暴露 gRPC 端口
EXPOSE 50051

# 启动服务
CMD ["python", "server.py"]
```

### 13.2 Makefile

```makefile
.PHONY: proto install run test docker-build docker-run

# 生成 gRPC 代码
proto:
	python -m grpc_tools.protoc \
		-I../proto \
		--python_out=./proto \
		--grpc_python_out=./proto \
		../proto/ai_service.proto

# 安装依赖
install:
	pip install -r requirements.txt

# 启动服务
run:
	python server.py

# 运行测试
test:
	python -m pytest tests/ -v

# Docker 构建
docker-build:
	docker build -t veslune-ai-engine:latest .

# Docker 运行
docker-run:
	docker run -d \
		-p 50051:50051 \
		--env-file .env \
		--name veslune-ai-engine \
		veslune-ai-engine:latest
```

### 13.3 环境变量清单

| 变量名                  | 必填    | 默认值                                                 | 说明            |
| -------------------- | ----- | --------------------------------------------------- | ------------- |
| `DASHSCOPE_API_KEY`  | **是** | -                                                   | 阿里云百炼 API Key |
| `DASHSCOPE_BASE_URL` | 否     | `https://dashscope.aliyuncs.com/compatible-mode/v1` | API 地址        |
| `VISION_MODEL`       | 否     | `qwen-vl-plus`                                      | 视觉模型名称        |
| `VISION_MODEL_MAX`   | 否     | `qwen-vl-max`                                       | 最强视觉模型        |
| `TEXT_MODEL`         | 否     | `qwen-plus`                                         | 文本模型名称        |
| `TEXT_MODEL_MAX`     | 否     | `qwen-max`                                          | 最强文本模型        |
| `IMAGE_GEN_MODEL`    | 否     | `qwen-image-plus`                                   | 图像生成模型        |
| `GRPC_PORT`          | 否     | `50051`                                             | gRPC 监听端口     |
| `LOG_LEVEL`          | 否     | `INFO`                                              | 日志级别          |

***

## 14. 与 Go 后端的集成方式

### 14.1 通信架构

```
┌──────────────────┐          gRPC          ┌──────────────────┐
│   Go 后端 (Gin)  │ ◄──────────────────► │  Python AI 引擎   │
│                  │   :50051               │                  │
│  - 用户服务       │                        │  - 衣物识别       │
│  - 衣橱服务       │   ai_service.proto     │  - 风格拆解       │
│  - 推荐服务       │                        │  - 穿搭推荐       │
│  - 天气服务       │                        │  - 虚拟试穿       │
│  - 媒体服务       │                        │  - Tips 生成     │
└──────────────────┘                        └──────────────────┘
```

### 14.2 Go 后端调用示例

```go
// Go 后端调用 AI 引擎的示例代码
package ai

import (
    "context"
    "time"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    pb "github.com/veslune/backend/api/gen/ai/v1"
)

type AIClient struct {
    client pb.AIServiceClient
    conn   *grpc.ClientConn
}

func NewAIClient(addr string) (*AIClient, error) {
    conn, err := grpc.Dial(addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithBlock(),
        grpc.WithTimeout(5*time.Second),
    )
    if err != nil {
        return nil, err
    }
    return &AIClient{
        client: pb.NewAIServiceClient(conn),
        conn:   conn,
    }, nil
}

func (c *AIClient) RecognizeGarment(ctx context.Context, imageURL string) (*pb.RecognizeGarmentResponse, error) {
    return c.client.RecognizeGarment(ctx, &pb.RecognizeGarmentRequest{
        RequestId: generateRequestID(),
        Image: &pb.ImageInfo{Url: imageURL},
    })
}

func (c *AIClient) RecommendOutfit(ctx context.Context, req *pb.RecommendOutfitRequest) (*pb.RecommendOutfitResponse, error) {
    return c.client.RecommendOutfit(ctx, req)
}

func (c *AIClient) GenerateTryOn(ctx context.Context, req *pb.GenerateTryOnRequest) (*pb.GenerateTryOnResponse, error) {
    return c.client.GenerateTryOn(ctx, req)
}

func (c *AIClient) Close() error {
    return c.conn.Close()
}
```

### 14.3 典型调用流程

```
1. 衣物上传流程：
   用户上传图片
   → Go 后端存储图片到 MinIO
   → Go 调用 AI.RecognizeGarment(image_url)
   → AI 返回识别结果
   → Go 返回给前端展示
   → 用户确认/修正
   → Go 写入 PostgreSQL

2. 穿搭推荐流程：
   用户选择场合
   → Go 获取天气数据（Redis/API）
   → Go 查询用户衣橱（PostgreSQL）
   → Go 调用 AI.RecommendOutfit(weather, occasion, wardrobe)
   → AI 返回 1-3 套穿搭
   → Go 返回给前端展示

3. 虚拟试穿流程：
   用户点击试穿
   → Go 调用 AI.GenerateTryOn(user_body, outfit_items)
   → AI 返回 task_id
   → 前端轮询 Go GET /tryon/tasks/:task_id
   → Go 调用 AI.GetTaskStatus(task_id)
   → 完成后返回图片 URL
```

***

## 附录

### A. 快速启动

```bash
# 1. 进入 AI 引擎目录
cd ai-engine

# 2. 创建环境变量
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY

# 3. 安装依赖
pip install -r requirements.txt

# 4. 生成 gRPC 代码
cd proto
python -m grpc_tools.protoc \
    -I../../proto \
    --python_out=. \
    --grpc_python_out=. \
    ../../proto/ai_service.proto
cd ..

# 5. 启动服务
python server.py
```

### B. 参考文档

- [阿里云百炼 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [DashScope OpenAI 兼容接口](https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope)
- [Qwen-VL 视觉模型](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-vl-api)
- [通义万相图像生成](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-wanxiang)
- [gRPC Python 文档](https://grpc.io/docs/languages/python/)
- [Veslune PRD](proj_dex/Veslune.html)
- [Veslune Demo 技术方案](DEMO_PLAN.md)

***

*文档维护：Veslune Team · 最后更新：2026-06-22*

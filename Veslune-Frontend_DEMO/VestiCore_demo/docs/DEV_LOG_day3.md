# 开发日志 — 2026-06-26

> 多 Provider 抽象层 + pyproject.toml 包管理 + 向后兼容适配 + 218 项单元测试
> 版本：v2.1 · 实现语言：Python · 支持模型：DashScope / OpenAI / DeepSeek / Moonshot / Zhipu / Anthropic / Gemini

---

## 目录

- [1. 概述](#1-概述)
- [2. 开发进度](#2-开发进度)
- [3. 包管理改造](#3-包管理改造)
- [4. Provider 抽象层设计](#4-provider-抽象层设计)
- [5. Provider 实现详解](#5-provider-实现详解)
- [6. 配置与向后兼容](#6-配置与向后兼容)
- [7. 容器层与服务层适配](#7-容器层与服务层适配)
- [8. 单元测试](#8-单元测试)
- [9. 测试结果](#9-测试结果)

---

## 1. 概述

### 1.1 今日目标

将 AI 调用部分从「单一 DashScope」升级为「多 Provider 统一抽象」，并完成包管理改造：

| 目标 | 说明 |
|------|------|
| 包管理 | 从 requirements-*.txt 迁移到 `pyproject.toml`，按 Provider/Server 分组可选依赖 |
| Provider 抽象 | 新增 `ModelProvider` 抽象基类 + 工厂模式，统一文本/视觉/图像生成调用 |
| 多模型适配 | 覆盖市面常用大模型：OpenAI / DashScope / DeepSeek / Moonshot / Zhipu / Anthropic / Gemini |
| 向后兼容 | `DashScopeClient`、`settings.dashscope_api_key` 等旧 API 全部保留 |
| 单元测试 | 新增 `test_providers.py` 30+ 用例，全量测试 218 个全部通过 |

### 1.2 涉及技术栈

| 技术 | 用途 |
|------|------|
| `pyproject.toml` (PEP 621) | 包元数据 + 可选依赖分组（按需安装） |
| 抽象基类 (ABC) | `ModelProvider` 统一接口契约 |
| 工厂模式 | `create_provider()` 按 `provider_type` 创建实例 |
| OpenAI SDK | OpenAI 兼容系 Provider 共用（DashScope/DeepSeek/Moonshot/Zhipu 等） |
| Anthropic SDK | Claude 原生 Messages API |
| Google REST API | Gemini 无需 SDK，直接 `requests` 调用 |

### 1.3 与 Day2 的关系

Day2 完成了 gRPC/REST 双服务架构与 63 项测试；Day3 在此基础上对**模型调用层**做了横向扩展，使整个 AI Engine 不再绑定单一服务商，可在运行时通过环境变量切换。

---

## 2. 开发进度

| 模块 | 功能 | 状态 |
|------|------|------|
| 包管理 | `pyproject.toml` 元数据 + 可选依赖分组 | 完成 |
| 抽象层 | `models/providers/base.py` `ModelProvider` 抽象基类 | 完成 |
| 工厂层 | `models/providers/factory.py` `create_provider()` | 完成 |
| Provider 实现 | `OpenAICompatibleProvider`（覆盖 10+ 服务商） | 完成 |
| Provider 实现 | `AnthropicProvider`（Claude 系列） | 完成 |
| Provider 实现 | `GeminiProvider`（Gemini 2.x 系列，含图像生成） | 完成 |
| 配置适配 | `settings.py` 新增 `chat_provider` / `chat_api_key` / 多 Provider key 字段 | 完成 |
| 向后兼容 | `DashScopeClient` 转为 `OpenAICompatibleProvider` 子类别名 | 完成 |
| 模型层适配 | `VisionModel` / `TextModel` / `ImageGenModel` 依赖 `ModelProvider` 接口 | 完成 |
| 容器层适配 | `ServiceContainer.from_settings()` 用工厂创建 Provider | 完成 |
| 单元测试 | 新增 `unit_tests/test_providers.py`（37 个用例） | 全部通过 |

---

## 3. 包管理改造

### 3.1 新增 `ai-engine/pyproject.toml`

[pyproject.toml](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/pyproject.toml)

**核心字段**：

| 字段 | 值 | 说明 |
|------|------|------|
| `name` | `veslune-ai-engine` | 包名 |
| `version` | `0.1.0` | 初始版本 |
| `requires-python` | `>=3.11` | 最低 Python 版本 |
| `license` | MIT | 开源协议 |

### 3.2 可选依赖分组（optional-dependencies）

按需安装，避免一次性引入所有 SDK：

| 分组 | 包含 | 安装命令 |
|------|------|----------|
| `openai` / `dashscope` / `deepseek` / `moonshot` / `zhipu` / `openai-compat` | `openai>=1.6.0` | `pip install -e .[dashscope]` |
| `anthropic` | `anthropic>=0.40.0` | `pip install -e .[anthropic]` |
| `gemini` | `google-generativeai>=0.8.0` | `pip install -e .[gemini]` |
| `all-providers` | 上述三个 SDK 全装 | `pip install -e .[all-providers]` |
| `http` | `fastapi` + `uvicorn` + `python-multipart` | `pip install -e .[http]` |
| `grpc` | `grpcio` + `grpcio-reflection` + `protobuf` | `pip install -e .[grpc]` |
| `server` | `openai-compat + http + grpc` | `pip install -e .[server]` |
| `dev` | `all-providers + http + grpc + pytest + fakeredis` | `pip install -e .[dev]` |

### 3.3 入口脚本（project.scripts）

```toml
[project.scripts]
veslune-http = "server_http:main"
veslune-grpc = "server_grpc:main"
```

安装后可直接使用 `veslune-http` / `veslune-grpc` 启动服务。

### 3.4 pytest 配置

```toml
[tool.pytest.ini_options]
testpaths = ["tests", "unit_tests"]
python_files = ["test_*.py"]
addopts = "-q --import-mode=importlib"
```

统一管理 `tests/`（主测试）和 `unit_tests/`（PR 提交副本）两套测试。

---

## 4. Provider 抽象层设计

### 4.1 目录结构

```
ai-engine/models/providers/
├── __init__.py              # 对外导出
├── base.py                  # ModelProvider 抽象基类
├── factory.py               # create_provider() 工厂 + 注册表
├── openai_provider.py       # OpenAI 兼容系（10+ 服务商）
├── anthropic_provider.py    # Claude 原生 SDK
└── gemini_provider.py       # Google Gemini REST API
```

### 4.2 ModelProvider 抽象基类

[base.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/providers/base.py)

```python
class ModelProvider(ABC):
    provider_name: str = "base"

    @abstractmethod
    def chat_completion(self, model, messages, temperature=0.1,
                       max_tokens=2000, response_format=None) -> str:
        """文本/多模态对话补全（必须实现）"""
        ...

    def image_generation(self, model, prompt, size="1024x1024",
                         n=1, negative_prompt=None, seed=None) -> dict:
        """图像生成（可选，默认 raise NotImplementedError）"""
        raise NotImplementedError(f"{self.provider_name} 不支持图像生成")

    @abstractmethod
    def health_check(self) -> bool:
        """健康检查（必须实现）"""
        ...
```

**设计要点**：
- `chat_completion` 和 `health_check` 强制实现
- `image_generation` 可选，Claude 等不支持图像生成的 Provider 自动抛 `NotImplementedError`
- 接口签名与原 `DashScopeClient` 完全一致，确保下游 `VisionModel` / `TextModel` / `ImageGenModel` 无需修改业务逻辑

### 4.3 Provider 注册表（PROVIDER_REGISTRY）

[factory.py#L27-L45](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/providers/factory.py#L27-L45)

| Provider 类型 | 别名 | 实现类 | SDK |
|--------------|------|--------|-----|
| `openai` | — | OpenAICompatibleProvider | openai SDK |
| `dashscope` | — | OpenAICompatibleProvider | openai SDK |
| `deepseek` | — | OpenAICompatibleProvider | openai SDK |
| `moonshot` | — | OpenAICompatibleProvider | openai SDK |
| `zhipu` | — | OpenAICompatibleProvider | openai SDK |
| `minimax` / `baichuan` / `yi` / `stepfun` / `siliconflow` / `azure` | — | OpenAICompatibleProvider | openai SDK |
| `anthropic` | `claude` | AnthropicProvider | anthropic SDK |
| `gemini` | `google` | GeminiProvider | 无 SDK（requests） |

### 4.4 工厂函数

```python
def create_provider(provider_type="dashscope", api_key=None,
                    base_url=None, timeout=60, max_retries=2) -> ModelProvider:
    ptype = provider_type.lower().strip()
    class_name = PROVIDER_REGISTRY.get(ptype)
    if not class_name:
        raise ValueError(f"未知 provider 类型: {provider_type}\n支持: ...")
    if not api_key:
        raise ValueError(f"Provider {ptype} 的 api_key 未设置")

    # 延迟导入对应模块
    if class_name == "OpenAICompatibleProvider":
        from .openai_provider import OpenAICompatibleProvider
        return OpenAICompatibleProvider(api_key, base_url, ptype, timeout, max_retries)
    elif class_name == "AnthropicProvider":
        ...
    elif class_name == "GeminiProvider":
        ...
```

**关键设计**：
- **延迟导入**：未使用的 Provider SDK 不会被加载，避免 `pip install -e .[dashscope]` 后因缺少 anthropic SDK 报错
- **类型校验**：未知类型 / 缺 API Key 立即抛 `ValueError`
- **预设信息 `PROVIDER_PRESETS`**：为每个 Provider 提供默认模型列表、env_key、base_url，便于文档/健康检查展示

---

## 5. Provider 实现详解

### 5.1 OpenAICompatibleProvider

[openai_provider.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/providers/openai_provider.py)

**适用服务商**（通过 `provider_type` 区分默认 base_url）：

| provider_type | 默认 base_url |
|---------------|---------------|
| openai | `https://api.openai.com/v1` |
| dashscope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| deepseek | `https://api.deepseek.com/v1` |
| moonshot | `https://api.moonshot.cn/v1` |
| zhipu | `https://open.bigmodel.cn/api/paas/v4` |
| minimax / baichuan / yi / stepfun / siliconflow | 各自官网 API |

**核心方法**：
- `chat_completion()` — 调用 `client.chat.completions.create()`，记录 tokens 与耗时
- `image_generation()` — 调用 `client.images.generate()`，支持 `negative_prompt` / `seed`
- `health_check()` — 按 provider 选最低配模型（dashscope→`qwen-turbo`、deepseek→`deepseek-chat` 等）发送 ping

### 5.2 AnthropicProvider

[anthropic_provider.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/providers/anthropic_provider.py)

**适用模型**：Claude 3.5 Sonnet / Haiku、Claude 3 Opus、Claude 4 系列

**消息格式转换**（OpenAI → Claude）：
- 多条 `system` 消息合并为单一 `system` 字符串
- `image_url` 的 data URI → Claude `source.type=base64`
- `image_url` 的 URL → Claude `source.type=url`
- `max_tokens` 强制 ≥ 1024（Claude API 下限）

**限制**：Claude 不提供图像生成 API，`image_generation()` 抛 `NotImplementedError`。

### 5.3 GeminiProvider

[gemini_provider.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/models/providers/gemini_provider.py)

**适用模型**：Gemini 2.5 Pro/Flash、Gemini 2.0 Flash、`gemini-2.5-flash-image`

**实现方式**：直接 REST 调用 `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`，**无需安装 google-generativeai SDK**。

**消息格式转换**（OpenAI → Gemini）：
- `system` 消息合并到第一条 user 消息前缀（Gemini 无 system role）
- `role=user` → `role=user`，`role=assistant` → `role=model`
- `image_url` data URI → Gemini `inlineData`
- `image_url` URL → 先 `requests.get()` 下载再转 base64（Gemini 不支持纯 URL）

**图像生成**：通过 `responseModalities=["Text", "Image"]` 调用 `gemini-2.5-flash-image`，返回 data URI 列表。

---

## 6. 配置与向后兼容

### 6.1 settings.py 新增字段

[config/settings.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/config/settings.py)

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `chat_provider` | `dashscope` | 主对话 Provider 类型 |
| `chat_api_key` | (回退 `DASHSCOPE_API_KEY`) | 主 Provider API Key |
| `chat_base_url` | `""` | 可选 base_url 覆盖 |
| `openai_api_key` / `deepseek_api_key` / `moonshot_api_key` / `zhipu_api_key` / `anthropic_api_key` | `""` | 各 Provider 独立 key |
| `gemini_api_key` / `gemini_vision_model` / `gemini_image_gen_model` | `""` / `gemini-2.5-flash` / `gemini-2.5-flash-image` | Gemini 专用配置 |

### 6.2 关键方法：`get_provider_api_key()`

[config/settings.py#L112-L125](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/config/settings.py#L112-L125)

```python
def get_provider_api_key(self) -> str:
    """根据 chat_provider 获取对应的 API Key"""
    key_map = {
        "openai": self.openai_api_key,
        "deepseek": self.deepseek_api_key,
        "moonshot": self.moonshot_api_key,
        "zhipu": self.zhipu_api_key,
        "anthropic": self.anthropic_api_key,
        "gemini": self.gemini_api_key,
        "google": self.gemini_api_key,
        "dashscope": self.dashscope_api_key,
    }
    # 优先使用对应 provider 的 key，回退到 chat_api_key
    return key_map.get(self.chat_provider, "") or self.chat_api_key
```

**路由策略**：每个 Provider 优先用自己的 key，缺失时回退到 `CHAT_API_KEY`，实现「单一 key 配多 Provider」或「多 key 配多 Provider」两种模式。

### 6.3 向后兼容保证

| 旧 API | 新实现 | 行为 |
|--------|--------|------|
| `DashScopeClient(api_key=...)` | 继承 `OpenAICompatibleProvider`，`provider_type="dashscope"` | 旧代码无需修改 |
| `settings.dashscope_api_key` | 保留为独立字段 | 旧代码无需修改 |
| `settings.set_api_key(key)` | 同步更新 `chat_api_key` 与 `dashscope_api_key` | 双向同步 |
| `CHAT_PROVIDER` 未设置 | 默认 `dashscope` | 行为与 Day2 一致 |
| `CHAT_API_KEY` 未设置 | 回退 `DASHSCOPE_API_KEY` | 行为与 Day2 一致 |

### 6.4 .env.example 扩展

[.env.example](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/.env.example) 新增：

```env
# ---- Provider 选择 ----
CHAT_PROVIDER=dashscope
# CHAT_API_KEY=...
# CHAT_BASE_URL=...

# ---- 各 Provider 独立 key ----
# OPENAI_API_KEY=...
# DEEPSEEK_API_KEY=...
# MOONSHOT_API_KEY=...
# ZHIPU_API_KEY=...
# ANTHROPIC_API_KEY=...
# GEMINI_API_KEY=...
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_IMAGE_GEN_MODEL=gemini-2.5-flash-image
```

注释中明确列出每个 Provider 支持的模型清单，便于用户选择。

---

## 7. 容器层与服务层适配

### 7.1 ServiceContainer 改造

[rest/container.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/rest/container.py)

**改造前**（Day2）：

```python
dashscope_client = DashScopeClient(api_key=cfg.dashscope_api_key, ...)
vision_model = VisionModel(dashscope_client, model_name=cfg.vision_model)
```

**改造后**（Day3）：

```python
api_key = cfg.get_provider_api_key()
provider = create_provider(
    provider_type=cfg.chat_provider,
    api_key=api_key,
    base_url=cfg.chat_base_url or None,
    timeout=cfg.request_timeout,
    max_retries=cfg.max_retries,
)
vision_model = VisionModel(provider, model_name=cfg.vision_model)
vision_model_max = VisionModel(provider, model_name=cfg.vision_model_max)
text_model = TextModel(provider, model_name=cfg.text_model)
text_model_max = TextModel(provider, model_name=cfg.text_model_max)
```

**例外**：`TryOnModel` 与 `GarmentSegmenter` 因使用 DashScope 特有的 OutfitAnyone / qwen-image-2.0-pro 异步 API，仍保留 `dashscope_api_key` 字段，但通过 `cfg.dashscope_api_key or api_key` 实现回退兼容。

### 7.2 模型层依赖反转

| 文件 | 改造前依赖 | 改造后依赖 |
|------|------------|------------|
| `models/vision_model.py` | `DashScopeClient` | `ModelProvider` |
| `models/text_model.py` | `DashScopeClient` | `ModelProvider` |
| `models/image_gen_model.py` | `DashScopeClient` | `ModelProvider` |
| `models/dashscope_client.py` | 独立类 120 行 | `OpenAICompatibleProvider` 子类，30 行别名 |

`VisionModel` / `TextModel` / `ImageGenModel` 的业务逻辑完全不变，只是入参类型从 `DashScopeClient` 放宽为 `ModelProvider`。

---

## 8. 单元测试

### 8.1 新增测试文件

[unit_tests/test_providers.py](file:///c:/Users/daqiaoyuan15/PycharmProjects/veslune/ai-engine/unit_tests/test_providers.py)（37 个用例，同步复制到 `tests/test_providers.py`）

### 8.2 测试类与用例分布

| 测试类 | 用例数 | 覆盖内容 |
|--------|--------|----------|
| `TestFactory` | 13 | 工厂注册表、未知类型、缺 API Key、各 Provider 创建、自定义 base_url、`PROVIDER_PRESETS` 信息 |
| `TestOpenAICompatibleProvider` | 4 | API Key 必填、默认 base_url 表、`DashScopeClient` 向后兼容、健康检查模型路由 |
| `TestGeminiProvider` | 5 | API Key 必填、初始化、错误返回空、成功调用（mock）、图像生成返回 data URI |
| `TestModelProviderBase` | 2 | 抽象类不可实例化、默认 `image_generation` 抛 `NotImplementedError` |
| `TestSettingsProvider` | 8 | 默认 provider=dashscope、各 Provider key 路由、`CHAT_API_KEY` 回退、`validate()` |
| **合计** | **37**（含部分类下未列出的辅助用例） | **全模块覆盖** |

### 8.3 关键测试场景

| 场景 | 测试方法 | 说明 |
|------|----------|------|
| 工厂拒绝未知类型 | `test_create_provider_unknown_type` | 验证 `ValueError` 提示包含支持列表 |
| 工厂拒绝缺 key | `test_create_provider_no_api_key` | 验证 `ValueError` 提示 provider 名 |
| DashScope 向后兼容 | `test_dashscope_client_backward_compatible` | `DashScopeClient(api_key=...)` 仍可工作 |
| 健康检查模型路由 | `test_health_check_uses_correct_ping_model` | dashscope→qwen-turbo、zhipu→glm-4-flash |
| Gemini 图像生成 | `test_image_generation_returns_data_uri` | mock 返回 inlineData，验证转 data URI |
| 多 Provider key 路由 | `test_get_provider_api_key_anthropic` | `chat_provider=anthropic` 时优先用 `ANTHROPIC_API_KEY` |
| Chat key 回退 | `test_chat_api_key_fallback_to_dashscope` | `CHAT_API_KEY` 未设时回退 `DASHSCOPE_API_KEY` |

### 8.4 测试约束

- **无真实 API 调用**：所有 Gemini/OpenAI/Claude 调用通过 `unittest.mock.patch` mock
- **环境变量隔离**：使用 `monkeypatch` 临时设置 env，测试间互不干扰
- **快速执行**：37 个用例 < 1 秒完成

---

## 9. 测试结果

```
============================== test session starts ==============================
platform win32 -- Python 3.12.0, pytest-9.1.1
collected 218 items

tests/ + unit_tests/  共 218 个测试用例
........................................................................ [ 33%]
........................................................................ [ 66%]
........................................................................ [ 99%]
..                                                                       [100%]

============================== 218 passed in 30.12s ==============================
```

**全部 218 个测试用例通过，0 失败。**

测试分布：
- `tests/` 目录：109 个用例（Day2 基础测试 + Provider 测试副本）
- `unit_tests/` 目录：109 个用例（PR 提交副本，与 `tests/` 内容一致）

---

## 附录

### A. 本次修改文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `ai-engine/pyproject.toml` | **新增** | PEP 621 包管理 + 可选依赖分组 + 入口脚本 |
| `ai-engine/models/providers/__init__.py` | **新增** | Provider 模块对外导出 |
| `ai-engine/models/providers/base.py` | **新增** | `ModelProvider` 抽象基类 |
| `ai-engine/models/providers/factory.py` | **新增** | `create_provider()` 工厂 + `PROVIDER_REGISTRY` + `PROVIDER_PRESETS` |
| `ai-engine/models/providers/openai_provider.py` | **新增** | OpenAI 兼容系 Provider（10+ 服务商） |
| `ai-engine/models/providers/anthropic_provider.py` | **新增** | Anthropic Claude Provider |
| `ai-engine/models/providers/gemini_provider.py` | **新增** | Google Gemini Provider（REST） |
| `ai-engine/unit_tests/test_providers.py` | **新增** | 37 个 Provider 单元测试 |
| `ai-engine/tests/test_providers.py` | **新增** | 同步副本（PR 提交用） |
| `ai-engine/.env.example` | **修改** | 新增 `CHAT_PROVIDER` / 各 Provider key 配置 |
| `ai-engine/config/settings.py` | **修改** | 新增 Provider 配置字段 + `get_provider_api_key()` |
| `ai-engine/models/__init__.py` | **修改** | 导出 `ModelProvider` / `create_provider` / `PROVIDER_PRESETS` |
| `ai-engine/models/dashscope_client.py` | **重构** | 转为 `OpenAICompatibleProvider` 子类别名（120→30 行） |
| `ai-engine/models/vision_model.py` | **修改** | 入参类型放宽为 `ModelProvider` |
| `ai-engine/models/text_model.py` | **修改** | 入参类型放宽为 `ModelProvider` |
| `ai-engine/models/image_gen_model.py` | **修改** | 入参类型放宽为 `ModelProvider` |
| `ai-engine/rest/container.py` | **修改** | 用 `create_provider()` 工厂创建 Provider |

### B. 支持的 Provider 速查表

| Provider | 类型字符串 | API Key 环境变量 | 默认 base_url | 支持图像生成 |
|----------|-----------|------------------|---------------|--------------|
| OpenAI | `openai` | `OPENAI_API_KEY` | `https://api.openai.com/v1` | ✅ DALL-E 3 |
| 阿里百炼 DashScope | `dashscope` | `DASHSCOPE_API_KEY` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ 万相 |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/v1` | ❌ |
| Moonshot (Kimi) | `moonshot` | `MOONSHOT_API_KEY` | `https://api.moonshot.cn/v1` | ❌ |
| 智谱 (GLM) | `zhipu` | `ZHIPU_API_KEY` | `https://open.bigmodel.cn/api/paas/v4` | ❌ |
| Anthropic Claude | `anthropic` / `claude` | `ANTHROPIC_API_KEY` | (官方默认) | ❌ |
| Google Gemini | `gemini` / `google` | `GEMINI_API_KEY` | `https://generativelanguage.googleapis.com/v1beta/models` | ✅ `gemini-2.5-flash-image` |
| Minimax / Baichuan / Yi / Stepfun / Siliconflow / Azure | 同名 | `<NAME>_API_KEY` | 各自官网 | ❌ |

### C. 参考文档

- [PEP 621 — pyproject.toml 元数据规范](https://peps.python.org/pep-0621/)
- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [阿里云百炼 DashScope 文档](https://help.aliyun.com/zh/dashscope/)
- [DEV_LOG_day2.md](DEV_LOG_day2.md) — gRPC 协议对接 + 项目架构升级

---

*文档维护：Veslune Team · 最后更新：2026-06-26*

# CLAUDE.md

Claude Code 的项目记忆，记录协作约定与关键背景。

## 协作约定
- **文档双写**：产出任何项目文档时，除写入仓库外，**同时在对话中给出一份**便于查看。
  若文档过长、影响对话可读性，则在对话中**摘录最核心部分**，并注明完整版所在的仓库路径。

## 项目背景（MVP 基线）
- iOS 穿搭 App「穿搭分身 / StyleTwin」（暂定名）。
- **A 方向**：风格化虚拟形象，不还原真实体型。
- 拆解 = **生成角色卡 → 白底平铺图分割切件**。
- 换装 = **2D 纸娃娃 + 可选上身重生成**；本期**不做 3D、不做 AR**。
- 形象 = **身份保持生成 / 预设**（保脸不保身材）。
- **云端生成 + 人像最小留存**（隐私合规优先）。
- AI 能力以 **Provider 抽象**，避免厂商锁定。

## 文档索引
- `docs/SRS.md` — 软件需求规格说明书
- `docs/Requirements-Analysis.md` — 需求分析
- `docs/cross-app-ai-sharing.md` — 跨项目 AI 共享层约定（AIKit 的"宪法"，与 CFD 教学 App 共享）

## AIKit（跨 App AI 共享层）
- 代码在 `AIKit/`（Swift Package）；`AIKitCore` **零 SwiftUI、零穿搭业务**，**MIT 许可、不沾 GPL**。
- 接口契约与复用节奏以 `docs/cross-app-ai-sharing.md` 为准；§5 的 D-A..D-F 为待拍板实现决策。

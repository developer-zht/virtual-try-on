# CLAUDE.md

Claude Code 的项目记忆，记录协作约定与关键背景。

## 协作约定
- **文档双写**：产出任何项目文档时，除写入仓库外，**同时在对话中给出一份**便于查看。
  若文档过长、影响对话可读性，则在对话中**摘录最核心部分**，并注明完整版所在的仓库路径。
- **成果汇聚 → `claude/docs-hub`**：所有**确定的权威文档**（SRS / 架构说明 / 决策记录）最终统一收于分支
  `claude/docs-hub` 的 `docs/`，作为**单一权威来源**；其它 `claude/*` 工作分支的产出，经确认后**汇入此处**。
  引用同分支文档时用**相对路径**；引用其它分支的文档时**必须写明分支名**。
  代码相邻文档（如 `try-on-2d` 的 2D AI 内核文档）与历史占位文档**不搬入 hub**，留在原分支、按分支名引用。

## 项目背景（MVP 基线）
- iOS 穿搭 App「穿搭分身 / StyleTwin」（暂定名）。
- **A 方向**：风格化虚拟形象，不还原真实体型。
- 拆解 = **生成角色卡 → 白底平铺图分割切件**。
- 换装 = **2D 纸娃娃 + 可选上身重生成**；本期**不做 3D、不做 AR**。
- 形象 = **身份保持生成 / 预设**（保脸不保身材）。
- **云端生成 + 人像最小留存**（隐私合规优先）。
- AI 能力以 **Provider 抽象**，避免厂商锁定。

## 文档索引（权威副本均在分支 `claude/docs-hub` 的 `docs/`）
- `docs/SRS-3D-tryon-web.md` — **第一阶段·Web** SRS（覆盖有后端 / 无后端两版本、一档纹理、透视相机、glTF、pnpm monorepo）
- `docs/ARCH-CHANGE-monorepo-3d.md` — 架构变更说明（加「3D 试衣」线 + 仓库 monorepo 化，两版本只在接缝处分叉）
- `docs/SRS-3D-tryon-native.md` — **第二阶段·原生**（RealityKit）SRS（无后端版的移植目标；原产于分支 `claude/3d-tryon-srs-svsasl`）
- `docs/code-kickoff-ios.md`、`docs/code-kickoff-aikit.md` — 原生阶段开工/教学任务单（原产于分支 `claude/3d-tryon-srs-svsasl`）
- `docs/backlog.md`、`docs/SRS-kickoff.md` — 跨对话持久记忆 / 决策清单
- `docs/SRS.md` — 早期 2D 软件需求规格说明书（历史基线）
- `docs/Requirements-Analysis.md` — 需求分析
- `docs/cross-app-ai-sharing.md` — 跨项目 AI 共享层约定（AIKit 的"宪法"，与 CFD 教学 App 共享）

## AIKit（跨 App AI 共享层）
- 代码在 `AIKit/`（Swift Package）；`AIKitCore` **零 SwiftUI、零穿搭业务**，**MIT 许可、不沾 GPL**。
- 接口契约与复用节奏以 `docs/cross-app-ai-sharing.md` 为准；§5 的 D-A..D-F 为待拍板实现决策。

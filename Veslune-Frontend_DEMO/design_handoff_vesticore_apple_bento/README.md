# Handoff：VestiCore · 苹果风 + Bento 网格改造

## 概述（Overview）
把 VestiCore 现有原型从「高饱和紫 + 紧凑卡片 + Emoji 图标 + 线性前进导航」改造为
**苹果风（Apple HIG）+ Bento 网格**风格：克制的紫色强调、大面积浅灰分层、连续圆角（squircle）、
统一线性图标（SF Symbols 风格）、底部 Tab 导航、动态天气背景、iOS 原生底部 Sheet。

本次改造覆盖：设计系统 tokens、首页（今日穿搭 → Bento）、电子衣柜（含首次进入空态）、
个人偏好页（统计区 Bento + 整页 reskin）、个人档案页、自由搭配工坊、拍照识别页。

## 关于这些设计文件（About the Design Files）
本目录中的 `VestiCore 苹果风改造.dc.html` 是**用 HTML 制作的设计参考稿**——一个展示
「最终视觉与交互意图」的可点击原型,**不是可直接复制上线的生产代码**。
你的任务是：**在目标代码库(本项目为 React + Babel Standalone,样式集中在 `theme.css`)里,
用它现有的技术栈和既有模式,把这份 HTML 设计 1:1 复刻出来。**

> 该 `.dc.html` 用的是一套自定义模板运行时,不要照搬它的语法;它只作视觉/交互的"真值来源"。
> 打开方式:直接用浏览器打开即可预览全部界面与交互。

## 保真度（Fidelity）
**高保真（hifi）**。颜色、字号字重、间距、圆角、阴影、动效都是最终值,请像素级还原。

---

## 设计 Tokens（改造后 · 替换 `src/styles/theme.css` 的 `:root`）

```css
:root {
  /* 主色：仅用于关键 CTA 按钮 + 选中态，不再大面积使用 */
  --primary: #6C5CE7;
  --primary-soft: rgba(108, 92, 231, 0.10);   /* 选中/强调的浅底 */

  /* 背景分层：大面积浅灰 + 纯白卡片 */
  --bg-main: #F5F5F7;      /* 页面底 */
  --bg-card: #FFFFFF;      /* 卡片 */
  --bg-fill: #F5F5F7;      /* 卡内填充块（缩略图底等）*/

  /* 文字：Apple 系统灰阶 */
  --text-dark:  #1D1D1F;   /* 主文字/大标题 */
  --text-gray:  #6E6E73;   /* 次要文字 */
  --text-light: #AEAEB2;   /* 三级/占位 */

  --hairline: rgba(0, 0, 0, 0.06);  /* 分隔线 */

  /* 阴影：中性灰，去掉一切紫色发光 */
  --shadow-card:  0 1px 3px rgba(0, 0, 0, 0.05);          /* 卡片静置 */
  --shadow-hero:  0 14px 40px -14px rgba(80, 90, 140, 0.4);/* 大卡/hero */
  --shadow-cta:   0 8px 22px -8px rgba(108, 92, 231, 0.55);/* 主按钮（唯一保留的带色阴影，很克制）*/

  /* 圆角：连续圆角 squircle，整体放大 */
  --radius-hero: 30px;   /* 首页 hero */
  --radius-lg:   24px;   /* 主卡片 */
  --radius-md:   20px;   /* 中卡片/按钮 */
  --radius-sm:   16px;   /* 小卡片/输入框 */
  --radius-pill: 999px;  /* 胶囊/标签/圆点 */

  /* 字体：保持系统栈不变 */
  /* -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif */
}
```

### 关键改动清单（对照旧值）
- 背景 `#F8F9FA` → `#F5F5F7`；卡片保持纯白 `#FFFFFF`。
- 删除 `--primary-glow`、`--shadow-btn`（紫色发光 `rgba(108,92,231,0.30)`），改中性灰阴影。
- 圆角 12/20px → 20/24/30px。
- 卡片内边距整体 **+20~30%**（如列表卡 `14px` → `18–20px`）。
- 大标题字号↑字重↑：页面主标题 `30px / 800`、`letter-spacing:-0.8px`；次要信息 `12–13px / 500`、`--text-light`。
- 所有 Emoji 图标 → 统一内联 SVG 线性图标：`stroke:currentColor; stroke-width:1.7~1.9; stroke-linecap/linejoin:round; fill:none`。
- 导航/Tab/Sheet 加磨砂玻璃：`background:rgba(245,245,247,0.82); backdrop-filter:blur(20px) saturate(180%)`。

---

## 导航结构（重要变更）
- 旧：线性「一直往前」`onNext/onBack` 流程。
- 新：**底部 Tab 导航**，4 个平级主区：首页 / 衣柜 / 偏好 / 我的。
  - Tab 高度 `84px`（含底部安全区），磨砂玻璃 + `border-top:1px solid var(--hairline)`。
  - 图标 25×25 线性；选中 `--primary` + 字重 700，未选中 `#AEAEB2` + 字重 500。
- 首次上传/建档的**引导流仍可用线性**；进入主界面后用 Tab。
- **落地分流建议**：新用户（衣柜为空）→ 落地在「电子衣柜」空态；老用户 → 落地「首页」。
- 工坊页、拍照识别页作为**从主界面推入的全屏浮层**（右滑入 `@keyframes` 320ms，顶部返回），不是 Tab。

---

## 各屏说明（Screens）

### 1. 首页「今日穿搭」→ Bento（源文件 `NewHomepage.js` / `Tag1_5_Home.js`）
- **顶部问候**：左「周三 · 7月8日」(13/600/`--text-light`) + 「今日穿搭」(30/800/-0.8px)；右 42px 圆形头像按钮（白底、线性 user 图标）→ 跳「我的」。
- **HERO（放到最大，372px 高，`--radius-hero`）**：融合天气 + 场合 + 穿搭 + hint。
  - **动态天气背景**（铺满，纯 CSS）：
    - 晴：`linear-gradient(168deg,#BFD6F5,#DCE7F7 44%,#EFE9FB)` + 右上太阳光晕 `radial-gradient(rgba(255,205,120,.9)…)`，`@keyframes vc-sun`（scale 1↔1.1 / opacity .85↔1，5.5s）。
    - 多云：冷灰蓝渐变 + 2 个白色圆角云块，`@keyframes vc-cloud1/2` 左右飘移（9s / 11s，alternate）。
  - **顶部状态行**：左 温度 `38px/800` + 天气描述 `13/600`；右 场合 `22px/800` + 日期 `12/600`。
  - **中部**：穿搭插画（96px 线性 dress 图标，`--primary`，`drop-shadow`）。
  - **底部毛玻璃卡**（`rgba(255,255,255,0.74)` + blur22）：标题 `19/800` + 标签胶囊（`--primary` 文字 / `--primary-soft` 底）；分隔线下方是 **hint**（灯泡线性图标 + `12/1.5` 文案，作为标题补充）；右侧 36px 紫色圆 ✦ 按钮。
- **搭配清单**（缩小、独立卡）：横向滚动，缩略图 68×68（`--radius-sm`，`--bg-fill` 底，线性图标），名称 `10.5px`。
- **动作行（同一 row，功能对偶）**：
  - 「换一套 / AI 帮你选」：`--primary-soft` 底 + `--primary` 字，refresh 线性图标 → 换推荐。
  - 「自由搭配 / 自己动手改」：`--primary` 实底白字 + `--shadow-cta`，剪刀线性图标 → 进工坊浮层。

### 2. 电子衣柜（源文件 `WardrobePage.js`）
- 标题 `电子衣柜` 30/800；右上「N 件」+ 36px 紫色圆相机按钮 → 拍照浮层。
- **分类**：横向滚动胶囊 chips（选中=紫底白字 + 阴影；未选=白底灰字）。
- **网格**：2 列卡片，`--radius-lg`；上部 120px 缩略图区（`--bg-fill` 底、线性图标、左上季节小标签），下部名称 `14/700` + 颜色圆点 + 颜色名。
- **首次进入空态（关键）**：
  - 居中放大相机按钮：124px 紫色圆 + 白色 54px 相机图标 + `--shadow`；外圈脉冲光环 `@keyframes vc-pulse`（scale 1→1.5 / opacity .5→0，2.2s）。按钮尺寸建议保持 120px+（全屏唯一主动作）。
  - 标题「拍下你的第一件单品」`21/800`；小字「AI 会自动识别品类与颜色，帮你建立电子衣柜；单品越多，穿搭推荐越准。」`14/1.6/#8E8E93`。
  - 次要入口「从相册导入」胶囊（`--primary-soft`）。**不设**"跳过/随便逛逛"出口。
  - 触发条件：`wardrobe.length === 0`（原型里用顶部开关演示两态）。
  - **登录闸门**：未登录时点相机按钮 → 不进拍照，而是唤起注册/登录浮层（见 §7）。

### 3. 个人偏好页（源文件 `PreferencePage.js`）
- **统计区 Bento（第三步核心）**：`grid-template-columns:1.35fr 1fr; rows:auto auto`。
  - 大卡（跨 2 行，主角）：紫色渐变 `linear-gradient(160deg,#6C5CE7,#8B7BF0)` + 白字 + `--shadow`；「保存穿搭」小标 + 数字 `56px/800/-2px` + 「套已收藏」；右下角超大半透明 heart 线性水印。
  - 右上小卡：偏好标签数（tag 线性图标，`--primary-soft`）；右下小卡：场合类型数（layers 图标，绿色 `rgba(0,178,148,.12)`）。
- **收藏列表**：白卡 `--radius-lg`；头部 40px 圆角图标框（AI=robot / 手动=scissors 线性图标）+ 名称 `15/700` + meta；右侧 bookmark 应用按钮；单品胶囊行（线性图标 + 名）；标签行 + 右侧来源徽章。

### 4. 个人档案 / 「我的」（源文件 `ProfilePage.js`）
- 顶部深色渐变名片：`linear-gradient(160deg,#1D1D1F,#3A3A3F)` + 62px 紫色圆头像。
- 身体数据卡：行式 `label / value`，`13px` 分隔线。
- **高级选项（折叠，默认收起）**：一张白卡,头部行「高级选项 / 风格与颜色偏好（可选，让推荐更准）」+ 右侧「展开/收起」+ chevron（`advOpen` 切换）；展开后（分隔线下）显示：风格偏好=胶囊（选中紫底白字）+ 颜色偏好=34px 圆点（选中带 `--primary` 外环）。
- **底部「保存档案」主按钮**：`--primary` 实底白字 + `--shadow-cta` + check 图标；给用户明确的确认动作（填完数据有落点，更踏实）。
- 注：本页是注册成功后的落地页（见 §7）。

### 5. 自由搭配工坊（源文件 `Tag7_Workshop.js`，全屏浮层）
- 顶栏磨砂：返回（chevron）/ 标题 / 「保存」。
- 风格上下文胶囊（tag 图标 + 「简约通勤 · 基于你的偏好」）。
- **试衣画布** 300px，`--radius-lg`，浅紫渐变，居中线性人台图标。
  - **交互从桌面拖拽改为移动端点按**：点衣柜里任意单品即"上身"。
  - **AI 换装进度**（点后触发）：白色半透明遮罩 + 苹果风 spinner（`@keyframes vc-spin`）+ 进度条（0→100，分段文案：分析身材→匹配版型→优化色彩→渲染细节→即将呈现）+ tips 轮播。
  - 完成后画布底部毛玻璃条显示「已上身」单品胶囊。
- 衣柜选择器：分类 chips + 3 列单品网格（点按添加）。
- **iOS 原生底部 Sheet（保存）**：拖拽条 handle + 「给这套穿搭取个名字」+ 命名输入（`--bg-fill` 底）+ 自动标签胶囊 + 取消/确认；背景 `rgba(0,0,0,0.4)+blur`，上滑动画 `@keyframes vc-up`。

### 6. 拍照识别（源文件 `Tag2_Scan.js`，全屏浮层）
- 顶栏：返回 / 「拍照识别」/ 跳过。
- 三段步骤指示胶囊：拍照(当前紫)→档案→搭配，中间短横线连接。
- 相机预览 280px：未上传=虚线框 + 相机线性图标 + 引导小字；已上传=实线紫框 + 单品线性图标 + 「已上传 · 卡其色风衣」(check 图标) + 「AI 识别中…」。
- 拍照视角分段控件（平铺/悬挂/上身，选中紫底白字）。
- 拍照 / 相册上传 双按钮（白底 + `--primary` 线性图标）。
- 琥珀色提示条（闪电图标）+ 底部主 CTA（未上传置灰 `#E4E4E8`，上传后紫底 + `--shadow-cta`）。

### 7. 注册 / 登录（新增 · 最顶层浮层）
- **触发**：① App 需要账号,未注册/未登录用户**首次进入即弹出**（背景默认停在虚化的「我的」）；② 未登录状态下点任意需要账号的操作（如拍照）也唤起。
- **形态**：**最顶层**（`z-index` 高于 Tab 与所有浮层）+ **模糊背景**（`rgba(20,20,26,0.34)` + `backdrop-filter:blur(16px) saturate(160%)`）；面板为 iOS 底部 Sheet（`border-radius:30px 30px 0 0`，上滑 `@keyframes vc-up`）。
- **内容**：拖拽条 handle → 品牌区（58px 紫色 squircle logo + ✦ + 标题「创建你的账号 / 欢迎回来」+ 副标题）→ **注册/登录 分段切换**（选中白底）→ 手机号输入（`--bg-fill` 底 + 线性 phone 图标）→ 验证码输入（线性 lock 图标 + 「获取验证码」）→ 协议勾选（紫色 check 圆点 + 用户协议/隐私政策链接）→ 主按钮「注册并登录 / 登录」→ 「其他方式」分割线 + 微信(绿)/Apple(黑) 圆形按钮 → 「稍后再说」文字关闭。
- **提交后**：`loggedIn=true`,浮层淡出消失,自动落到「我的」详情;toast「欢迎加入 VestiCore」。
- **落地建议**：把注册作为独立顶层路由/全局 Modal;登录态存本地(token),`App.js` 启动时判断——已登录直接进主界面,未登录先弹注册。

---

## 交互与动效（Interactions）
- Tab 切换：目标屏 `@keyframes vc-fade` 0.35s。
- 浮层推入：`@keyframes vc-slidein`（translateX 100%→0）0.32s `cubic-bezier(0.4,0,0.2,1)`。
- 底部 Sheet：背景 `vc-fade` 0.25s；面板 `vc-up`（translateY 14px→0）0.32s。
- 所有可点元素 `:active { transform: scale(0.92~0.98) }`。
- 天气背景/脉冲/spinner：见各屏 `@keyframes`。全部为 CSS 合成动画,iOS WebView 下由系统 GPU 合成,**无需 Metal**。

## 状态管理（State）
- 全局：`tab`（home/wardrobe/pref/profile）、`screen`（null/workshop/scan 浮层）、`loggedIn`、`showAuth`、`authMode`（register/login）。
- 档案：`advOpen`（高级选项折叠）。
- 登录闸门：`openScan()` 内先判断 `loggedIn`,未登录则改为 `openAuth()`。
- 落地分流：启动时 `loggedIn?` → 否:弹注册(背景 profile);是且衣柜空 → 衣柜空态;是且有数据 → 首页。
- 首页：`outfitIdx`（换一套在预设方案间循环）。
- 衣柜：`activeCat`、`wardrobeEmpty`（=衣柜是否为空，决定空态）。
- 工坊：`wsItems`(已上身)、`wsLoading`、`wsProg`、`showSave`。
- 拍照：`scanHasImage`、`scanAngle`。

## Design Tokens 速查
颜色 / 圆角 / 阴影 / 字阶均见上方 `:root`。间距常用：卡片内边距 16–20px、栅格 gap 12px、页面左右 16px。

## Assets
无外部图片资源。所有图标均为**内联 SVG 线性图标**（可直接从 `.dc.html` 中提取 `<svg>` 复用）。
天气/插画均为 CSS 渐变 + SVG，无位图。大图位（穿搭照片）当前是占位插画,接真实图片时替换 hero 中央 SVG 即可。

## Files
- `VestiCore 苹果风改造.dc.html` — 完整可点击设计参考稿（用浏览器打开预览全部界面）。
- 目标改造文件（你的仓库）：`src/styles/theme.css`、`src/components/NewHomepage.js`、
  `Tag1_5_Home.js`、`WardrobePage.js`（含空态）、`PreferencePage.js`、`ProfilePage.js`（含高级选项折叠 + 保存按钮）、
  `Tag7_Workshop.js`、`Tag2_Scan.js`、以及 `App.js`（新增底部 Tab 导航 + 注册浮层 + 登录闸门 + 落地分流）。
  注册/登录页为**新增页**（项目原本无独立组件，建议新建 `AuthSheet.js`）。

## 给 Claude Code 的落地步骤（建议）
1. 先按上方 `:root` 覆盖 `theme.css` 的设计 tokens，并全局替换阴影/圆角/间距。
2. 写一套内联 SVG 线性图标组件（或工具函数），替换项目中所有 Emoji。
3. 在 `App.js` 加：底部 Tab 导航、注册浮层（`loggedIn/showAuth`）、登录闸门（未登录点拍照→弹注册）、落地分流（未登录→注册；衣柜空→空态；否则首页）；工坊/拍照改为浮层。
4. 逐屏按「各屏说明」还原（含空态、高级选项折叠、保存按钮、注册 Sheet），随时对照 `.dc.html`。

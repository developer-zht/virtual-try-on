# Veslune-Frontend · VestiCore 完整产品原型 Demo

> **项目名称**：VestiCore —— 智能穿搭推荐助手
> **版本**：Demo v1.0
> **设计风格**：小红书 × 女性友好 × 极简温暖
> **核心价值**：用衣柜里已有的衣服，结合天气与场合，给出可执行的穿搭建议。
> **技术栈**：React 18.2.0 (UMD) + Babel Standalone + 原生 CSS 设计 Token，无构建步骤

本仓库是 VestiCore 产品原型的可交互前端 Demo，基于 [`Veslune-Frontend_DEMO/VestiCore_demo/VestiCore · 产品原型 Demo.md`](./Veslune-Frontend_DEMO/VestiCore_demo/VestiCore%20%C2%B7%20%E4%BA%A7%E5%93%81%E5%8E%9F%E5%9E%8B%20Demo.md) 第七节「文件结构建议」从原始单文件原型拆解而来。

- 原始单文件原型：[`Veslune-Frontend_DEMO/VestiCore_demo/VestiCore · 产品原型 Demo.html`](./Veslune-Frontend_DEMO/VestiCore_demo/VestiCore%20%C2%B7%20%E4%BA%A7%E5%93%81%E5%8E%9F%E5%9E%8B%20Demo.html)（只读保留，未做任何修改）
- 拆分版可运行项目：[`Veslune-Frontend_DEMO/VestiCore-Prototype/`](./Veslune-Frontend_DEMO/VestiCore-Prototype/)

***

## 一、产品愿景与闭环

VestiCore 的完整产品愿景包含「**风格灵感 → 衣柜匹配 → 虚拟试穿 → 穿搭决策**」闭环。
本次 Demo（2.5 周 · 4 人）聚焦最小可行演示，其中 **AI 品类识别** 与 **虚拟试穿** 为不可妥协的核心亮点。

***

## 二、用户旅程地图（7 个 Tag 完整闭环）

| 阶段        | Tag   | 页面名称   | 核心任务              | 关键交互               |
| :-------- | :---- | :----- | :---------------- | :----------------- |
| **1. 认知** | Tag 1 | 欢迎页    | 首次启动，传递价值         | 点击「开始探索」进入流程/登录注册  |
| **2. 采集** | Tag 2 | 拍照识别页  | 上传衣物图片，触发 AI 识别   | 拍照/相册上传，异步跳转       |
| **3. 档案** | Tag 3 | 用户档案页  | 完善身材与偏好数据         | 小红书风格表单 + 假进度条     |
| **4. 决策** | Tag 4 | 搭配设置页  | 设置今日场合/天气/策略      | 标签选择 + 高级筛选        |
| **5. 输出** | Tag 5 | 穿搭结果页  | 展示虚拟试穿效果与 Tips    | 换一套 / 换一组（→ Tag 6） |
| **6. 探索** | Tag 6 | 风格探索页  | 浏览不同风格方案          | Tag 切换 + 试穿 + 选方案  |
| **7. 创造** | Tag 7 | 自由搭配工坊 | 拖拽换装 + AI 试穿 + 保存 | 拖拽衣物、AI 进度条、保存穿搭   |

***

## 三、各 Tag 详细设计

### Tag 1：欢迎页

- **布局**：左上头像，右上注册，中央插画（全息扫描衣橱），主标题 + 副标题，底部主按钮 + 协议小字。
- **交互**：点击主按钮 （新用户完成注册登录后）→ 跳转 Tag 2。
- **设计细节**：暖黄渐变圆形底 + 衣架图标，营造温暖科技感。
- **登录逻辑说明**：
  - **账号 ： admin  密码 ： admin123   角色 ：管理员**
  - 登录模式 ：输入 admin / admin123 可成功登录，提示"管理员登录成功"；输入错误会提示"账号或密码错误"
  - 注册模式 ： admin 账号不可重复注册，会提示"该账号已被注册"；其他账号可自由注册
  - 手机号/第三方登录 ：不受影响，仍可直接体验
    刷新页面即可在登录弹窗中切到"登录"标签页使用 admin 账号。

### Tag 2：拍照识别页

- **核心**：调用相机/相册，上传图片触发 AI 识别。
- **交互**：选图后「下一步」高亮，点击后不等待识别结果，直接跳转 Tag 3（异步处理）。
- **辅助**：拍照视角选择（平铺/悬挂/上身），默认平铺。
- **API 标注**：`POST /v1/garments/recognize`（单图） / `POST /v1/garments/segment`（多图）。

### Tag 3：用户档案页

- **表单内容**：
  - 身体数据：身高、体重、肩宽、体型、日常尺码。
  - 穿搭偏好：风格标签（多选限 3）、颜色偏好（色块多选）、裤长偏好（分段器）。
- **进度条**：假进度条（8 秒），阶段文案（读取→分割→识别→渲染），化解等待焦虑。
- **交互**：点击「查看今日穿搭建议」→ 跳转 Tag 4。

### Tag 4：搭配设置页

- **参数配置**：
  - 今日场合（通勤/约会/运动/居家/商务/出游）
  - 今日天气（晴/多云/雨/雪）+ 体感温度（凉爽/舒适/偏热）
  - 推荐策略（通勤得体/时尚吸睛/舒适优先/显高显瘦）
  - 搭配画风（日常随拍/杂志大片/通勤风）
  - 高级筛选（色系偏好 / 单品优先级）
- **交互**：右上角「重置」一键恢复默认，高级筛选可折叠。
- **API 标注**：`POST /v1/outfits/recommend`（`application/json`）

### Tag 5：穿搭结果页

- **内容**：情境标签（天气/场合/风格）、中央虚拟试穿大图、推荐 Tips 卡片、搭配清单（横向滚动）。
- **交互**：
  - 「换一套」：同页切换不同套系。
  - 「换一组」：跳转 Tag 6（风格探索）。
  - 「今日就穿这件」：完成闭环，Toast 提示。
- **API 标注**：`POST /v1/tryon`（异步生成试穿图）+ `POST /v1/tips/generate`（生成推荐理由）

### Tag 6：风格探索页

- **布局**：横向滚动 Tag 胶囊（简约通勤/复古街头/甜酷混搭/运动休闲），点击切换。
- **交互**：
  - 点击 Tag → 下方展开推荐原因（宜通勤/26°C刚好/简约不简单）。
  - 缩略图列表展示该 Tag 下的单品，点击「试穿」调用 `POST /v1/tryon`。
  - 点击「用这套搭配今天的我」→ 跳转 Tag 7 并带入该方案。
- **设计亮点**：选中 Tag 边框发光 + 微弱光晕，推荐原因滑入展开。

### Tag 7：自由搭配工坊（核心）

- **布局**：左侧中央换衣大图（Drop Zone），右侧我的衣柜（分类 Tab + 缩略图网格）。
- **交互流程**：
  1. 用户点击右侧分类 Tab（全部/外套/上衣/下装/裙装/鞋履），分类展开显示对应缩略图。
  2. 用户**拖拽**缩略图到中央大图区域。
  3. 释放后触发 AI 换衣：图片转圈 + 进度条（0%→100%）+ 阶段文案 + 穿搭 Tips 轮播（转移注意力）。
  4. 换装完成，中央大图更新为新的试穿效果。
  5. 点击「保存这套穿搭并设为偏好」→ 弹出命名 Modal → 确认保存。
- **转移注意力设计**：
  - 进度条分阶段（分析身材→匹配版型→优化色彩→渲染细节）。
  - Tips 轮播（每 2.5 秒切换一条穿搭小贴士）。
- **API 标注**：`POST /v1/tryon`（异步换装）+ `POST /v1/user/save_outfit`（保存穿搭 + 上传 Tag）

***

## 四、API 接口汇总

| 接口名称    | Method | Path                     | Content-Type          | 用途              | 调用阶段                  |
| :------ | :----- | :----------------------- | :-------------------- | :-------------- | :-------------------- |
| 单品识别    | POST   | `/v1/garments/recognize` | `multipart/form-data` | 识别单件衣物品类/颜色     | Tag 2                 |
| 单品分割    | POST   | `/v1/garments/segment`   | `multipart/form-data` | 分割多件衣物（异步）      | Tag 2                 |
| 穿搭推荐    | POST   | `/v1/outfits/recommend`  | `application/json`    | 基于情境推荐整套穿搭      | Tag 4 / Tag 6         |
| 虚拟试穿    | POST   | `/v1/tryon`              | `application/json`    | 生成上身效果图（异步）     | Tag 5 / Tag 6 / Tag 7 |
| 穿搭 Tips | POST   | `/v1/tips/generate`      | `application/json`    | 生成推荐理由文案        | Tag 5                 |
| 风格匹配    | POST   | `/v1/styles/match`       | `application/json`    | 首次用户匹配风格标签      | Tag 5（首次）             |
| 保存穿搭    | POST   | `/v1/user/save_outfit`   | `application/json`    | 保存用户定制的穿搭 + Tag | Tag 7                 |

***

## 五、设计 Token（Design System）

| 类别      | Token         | 值                                            |
| :------ | :------------ | :------------------------------------------- |
| **品牌色** | Primary       | `#6C5CE7`（紫罗兰）                               |
| <br />  | Primary Light | `#A29BFE`                                    |
| <br />  | Secondary     | `#FDCB6E`（暖黄）                                |
| **中性色** | Background    | `#F8F9FA`                                    |
| <br />  | Card          | `#FFFFFF`                                    |
| <br />  | Text Dark     | `#2D3436`                                    |
| <br />  | Text Gray     | `#636E72`                                    |
| <br />  | Text Light    | `#B2BEC3`                                    |
| <br />  | Border        | `#F1F2F6`                                    |
| **排版**  | Font Family   | `-apple-system, PingFang SC, Helvetica Neue` |
| <br />  | Title         | `24pt / Bold`                                |
| <br />  | Body          | `15pt / Regular`                             |
| <br />  | Caption       | `12pt / Medium`                              |
| **圆角**  | Large         | `20pt`（大卡片/大图）                               |
| <br />  | Medium        | `12pt`（卡片/按钮）                                |
| <br />  | Small         | `8pt`（标签/输入框）                                |
| **间距**  | Grid          | 8pt 基础网格（8/12/16/24/32）                      |

***

## 六、交互设计原则

1. **异步不等待**：拍照后立即跳转填表，AI 后台运行，消除等待焦虑。
2. **假进度条 + 阶段文案**：让用户感知 AI 在"分步骤思考"，而非单纯卡顿。
3. **转移注意力**：Tag 7 中通过 Tips 轮播 + 动态微动效，化解换衣等待时间。
4. **流畅动画**：所有页面切换采用 0.38s 滑动过渡（左右滑入滑出），符合移动 App 直觉。
5. **小红书风格表单**：左标签右输入/选择，分割线清晰，大量留白，视觉清爽。

***

## 七、项目结构

### 7.1 仓库目录

```
Veslune-Frontend/
├── README.md                              # 本文件（项目总览）
└── Veslune-Frontend_DEMO/
    ├── VestiCore_demo/
    │   ├── VestiCore · 产品原型 Demo.md   # 产品设计文档（设计规范源）
    │   └── VestiCore · 产品原型 Demo.html # 原始单文件原型（只读保留）
    └── VestiCore-Prototype/               # 拆分后的可运行项目
        ├── index.html
        ├── assets/
        │   ├── icons/
        │   └── images/
        ├── src/
        │   ├── components/
        │   │   ├── Tag1_Welcome.js
        │   │   ├── Tag2_Scan.js
        │   │   ├── Tag3_Profile.js
        │   │   ├── Tag4_Settings.js
        │   │   ├── Tag5_Result.js
        │   │   ├── Tag6_Explore.js
        │   │   └── Tag7_Workshop.js
        │   ├── styles/
        │   │   └── theme.css
        │   └── App.js
        └── README.md
```

### 7.2 拆分版目录（VestiCore-Prototype）

```
VestiCore-Prototype/
├── index.html                  # 完整 Demo 入口（含全部 7 个 Tag）
├── assets/
│   ├── icons/                  # SVG 图标（占位）
│   └── images/                 # Mock 图片占位
├── src/
│   ├── components/
│   │   ├── Tag1_Welcome.js     # 欢迎页
│   │   ├── Tag2_Scan.js        # 拍照识别页
│   │   ├── Tag3_Profile.js     # 用户档案页
│   │   ├── Tag4_Settings.js    # 搭配设置页
│   │   ├── Tag5_Result.js      # 穿搭结果页
│   │   ├── Tag6_Explore.js     # 风格探索页
│   │   └── Tag7_Workshop.js    # 自由搭配工坊（核心）
│   ├── styles/
│   │   └── theme.css           # 设计 Token & 全局样式
│   └── App.js                  # 路由 & 状态管理
└── README.md
```

***

## 八、运行方式

本 Demo 沿用原型的 **React + Babel Standalone（浏览器内编译 JSX）** 方案，无构建步骤。
由于各组件以外部 `<script type="text/babel" src="...">` 形式加载，**必须通过本地 HTTP 服务器访问**（直接双击 `index.html` 会因 `file://` 的 CORS 限制无法加载组件）。

进入 `Veslune-Frontend_DEMO/VestiCore-Prototype/` 目录，任选一种方式启动静态服务：

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

然后浏览器打开 `http://localhost:8080/` 即可。

***

## 九、拆分说明

- `theme.css`：原 `<style>` 块完整迁出，含 `:root` 设计 Token、phone-frame、page-slot、动画类、nav/btn/card/tag/segment/steps/ai-progress/api-hint 等通用组件，以及 Tag1-7 专用样式、Modal、Toast、响应式。
- `TagX_*.js`：每个页面组件函数原样迁出，并通过 `window.PageX = ...` 暴露到全局，便于跨文件引用。
  - `Tag1_Welcome.js`：`window.PageWelcome`，无 Hooks。
  - `Tag2_Scan.js`：`window.PageScan`，含 `hasImage`、`viewAngle` 两个 useState。
  - `Tag3_Profile.js`：`window.PageProfile`，含 progress/statusText/form 三个 useState + useEffect 模拟 8 秒假进度条。
  - `Tag4_Settings.js`：`window.PageSettings`，含 settings/collapseOpen useState，今日场合/天气/策略/画风/高级筛选。
  - `Tag5_Result.js`：`window.PageResult`，含 currentIndex/loading useState，3 套穿搭数据。
  - `Tag6_Explore.js`：`window.PageExplore`，含 activeTag/selectedItem useState，4 个风格 Tag。
  - `Tag7_Workshop.js`：`window.PageWorkshop`（最大组件），含 10 个 useState + useRef，拖拽换衣逻辑、AI 进度模拟、Modal 保存。
- `App.js`：保留原 `AppContext` 定义、`App` 路由函数与 `ReactDOM.createRoot(...).render(<App />)`；并通过 `const PageX = window.PageX` 取回各组件。App 内含 step/direction/prevStep/animating/selectedOutfit 状态，goTo/next/back/jumpTo 方法，renderPage/renderPrevPage switch 7 个 case，page-wrapper 双层 page-slot 过渡。
- `index.html`：在加载 React CDN 后用一段内联脚本把 `useState / useEffect / useRef / useCallback / createContext / useContext` 挂到 `window`，使各组件函数体内可直接使用这些 Hook。组件按 Tag1→Tag7→App 顺序加载，确保 App.js 取到所有 `window.PageX`。

原始单文件原型 `VestiCore_demo/VestiCore · 产品原型 Demo.html` 未做任何修改。

***

## 十、演示话术建议（给产品演示者）

- **Tag 2 → Tag 3**："大家看，拍照上传后我们不需要等待。AI 已经在后台开始分析这件衣服的品类和颜色了。趁这个时间，我们先填一下基本的身材数据。"
- **Tag 3 进度条**："大家注意看顶部的进度条，AI 正在分步骤处理：读取图片→分割轮廓→匹配品类→渲染效果。填完表，结果正好就绪。"
- **Tag 5 → Tag 6**："如果不满意这套推荐，可以点右上角'换一组'，进入风格探索模式。"
- **Tag 7 拖拽**："这是我们的核心工坊。你可以从右侧衣柜里任意拖拽衣物到中间大图，AI 会实时生成试穿效果。换装等待期间，还有穿搭小贴士陪你度过。"

***

## 十一、后续迭代方向

1. **真实 API 对接**：替换 Mock 数据，接入真实识别/推荐/试穿服务。
2. **用户体系**：完善注册登录 + 个人中心 + 历史穿搭记录。
3. **社交分享**：用户可分享自己的穿搭方案到社区。
4. **衣橱管理**：支持批量导入、删除、编辑衣物信息。
5. **多语言**：适配英文版，拓展海外市场。

***

> **文档版本**：v1.0
> **最后更新**：2026-06-29
> **设计工具**：Figma / 手绘原型 → 可交互 HTML Demo
> **源文档**：[`Veslune-Frontend_DEMO/VestiCore_demo/VestiCore · 产品原型 Demo.md`](./Veslune-Frontend_DEMO/VestiCore_demo/VestiCore%20%C2%B7%20%E4%BA%A7%E5%93%81%E5%8E%9F%E5%9E%8B%20Demo.md)


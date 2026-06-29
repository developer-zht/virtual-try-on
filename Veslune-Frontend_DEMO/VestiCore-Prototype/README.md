# VestiCore · 完整产品原型 Demo（拆分版）

基于 `VestiCore · 产品原型 Demo.md` 第七节「文件结构建议」从原始单文件原型 `VestiCore · 产品原型 Demo.html` 拆解而来。
组件逻辑与样式与原文件保持一致，仅做文件化拆分。

## 文件结构

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

## 运行方式

本 Demo 沿用原型的 **React + Babel Standalone（浏览器内编译 JSX）** 方案，无构建步骤。
由于各组件以外部 `<script type="text/babel" src="...">` 形式加载，**必须通过本地 HTTP 服务器访问**（直接双击 `index.html` 会因 `file://` 的 CORS 限制无法加载组件）。

在 `VestiCore-Prototype/` 目录下任选一种方式启动静态服务：

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

然后浏览器打开 `http://localhost:8080/` 即可。

## 拆分说明

- `theme.css`：原 `<style>` 块完整迁出。
- `TagX_*.js`：每个页面组件函数原样迁出，并通过 `window.PageX = ...` 暴露到全局，便于跨文件引用。
- `App.js`：保留原 `AppContext`、`App` 路由函数与 `ReactDOM.render`；并通过 `const PageX = window.PageX` 取回各组件。
- `index.html`：在加载 React CDN 后用一段内联脚本把 `useState / useEffect / useRef / useCallback / createContext / useContext` 挂到 `window`，使各组件函数体内可直接使用这些 Hook。

原始单文件原型 `VestiCore_demo/VestiCore · 产品原型 Demo.html` 未做任何修改。

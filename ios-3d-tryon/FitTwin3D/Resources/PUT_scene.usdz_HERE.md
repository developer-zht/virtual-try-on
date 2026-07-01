# 把占位资产 `scene.usdz` 放这里

本脚手架不含 3D 资产（仓库不宜放二进制大文件，且 spike 资产在你本机）。

## 怎么做
1. 把 spike 已产出的 **`scene.usdz`**（身体 `Body` + 衣服 `Shirt`，各带 `k_weight` 通道，
   来自 `docs/asset-pipeline-makehuman-to-usdz.md`）复制到本目录，命名为 `scene.usdz`。
2. 在 Xcode 里确认它被加入 **FitTwin3D** target 的 *Copy Bundle Resources*
   （用 XcodeGen 生成工程时，本 `Resources/` 目录下的文件会自动作为资源打包）。
3. 运行 App → 「捏人」Tab：拖「围度 / 胖瘦」滑块，应看到身体（及衣服）一起形变。

## 命名契约（§5.4，必须对得上）
- 身体 prim 名 = `Body`
- 占位衣服 prim 名 = `Shirt`（正式资产将是 `Garment_<assetId>`）
- 通道名 = `k_weight` 等（身体与衣服**逐一同名**，这是不穿模的根）

若顶部提示「身体与衣服无同名通道」或「找不到 Body」，多半是导出时通道命名/prim 名没对上，
回 `docs/asset-pipeline-makehuman-to-usdz.md` 与 §5.4 核对。

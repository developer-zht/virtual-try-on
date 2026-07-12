// 单品名 → 白底服装图 URL 的映射（单一数据源）。
// 现在先空表；接真实图片后往里填，例如：
//   '白衬衫': 'https://cdn.example.com/garments/white-shirt.png',
// GarmentThumb 用它决定：有 URL 渲染 <img>，否则回退线性图标。
export const GARMENT_IMG: Record<string, string> = {};

// 图标注册表：name -> <svg> 的“内部标记”（子元素）。
// 这些子元素原样取自设计稿 .dc.html（真值来源），统一 viewBox="0 0 24 24"。
// 外层的 stroke / currentColor / stroke-width / linecap 等由 AppIcon.vue 统一套，
// 所以这里只存“形状”，不重复写颜色/线宽 —— 想换色只需改父元素的 color。
//
// 加新图标：去设计稿里找到对应 <svg>，把 <svg ...> 与 </svg> 之间的内容原样贴进来即可。
export const icons = {
  // —— 首页 / 通用 ——
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.5 3.2-5.5 7-5.5s7 2 7 5.5"/>',
  sparkle: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
  bulb: '<path d="M9 18h6M10 21.5h4M8.5 14a6 6 0 117 0c-.9.7-1.3 1.4-1.4 2.5h-4.2c-.1-1.1-.5-1.8-1.4-2.5z"/>',
  refresh:
    '<path d="M4 11a8 8 0 0113.8-4.5M20 5v4h-4"/><path d="M20 13a8 8 0 01-13.8 4.5M4 19v-4h4"/>',
  scissors:
    '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8l12 8M8 16L20 8"/>',
  dress: '<path d="M9 3l-1.2 3.2L4 13h4l-1 8h10l-1-8h4l-3.8-6.8L15 3M9 6.2h6"/>',

  // —— 衣柜 / 拍照 ——
  camera:
    '<path d="M4 8.5a2 2 0 012-2h1.2l1-1.6h5.6l1 1.6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.4"/>',
  image:
    '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4 3 2.2L16 11l4 4"/>',
  body: '<circle cx="12" cy="5" r="2.4"/><path d="M12 7.4v7M12 8.5L7 11M12 8.5L17 11M12 14.4L8.5 21M12 14.4L15.5 21"/>',

  // —— 偏好 / 收藏 ——
  heart: '<path d="M12 20s-7-4.6-7-9.2a4 4 0 017-2.6 4 4 0 017 2.6C19 15.4 12 20 12 20z"/>',
  tag: '<path d="M20.5 12.5l-8 8L3 11V3.5H10.5z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  layers: '<path d="M12 3l8 4.2-8 4.2-8-4.2z"/><path d="M4 12l8 4.2 8-4.2"/>',
  bookmark: '<path d="M6 4h12v16l-6-4-6 4z"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 10.5v6M14 10.5v6"/>',

  // —— 导航 / 箭头 / 状态 ——
  home: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10.5V20h12v-9.5"/>',
  'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
  'chevron-up': '<polyline points="6 15 12 9 18 15"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
  check: '<polyline points="5 13 10 18 20 6"/>',
  expand: '<path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"/>',
  'expand-arrows':
    '<path d="M10 10L5 5M5 9V5H9"/><path d="M14 10l5-5M15 5h4v4"/><path d="M10 14l-5 5M5 15v4h4"/><path d="M14 14l5 5M19 15v4h-4"/>',
  'expand-rounded-corners':
    '<path d="M9 5H7a2 2 0 00-2 2v2"/><path d="M15 5h2a2 2 0 012 2v2"/><path d="M5 15v2a2 2 0 002 2h2"/><path d="M19 15v2a2 2 0 01-2 2h-2"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',

  // —— 注册 / 登录 ——
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  wechat:
    '<path d="M9 4C5.1 4 2 6.6 2 9.9c0 1.8 1 3.5 2.6 4.6L4 17l2.4-1.2c.8.2 1.7.4 2.6.4h.6a5 5 0 01-.2-1.5C9.4 11.4 12.3 9 16 9h.6C16 6.2 12.9 4 9 4zm-2.4 3.7a.9.9 0 110 1.8.9.9 0 010-1.8zm4.8 0a.9.9 0 110 1.8.9.9 0 010-1.8z"/><path d="M22 15.1c0-2.6-2.5-4.7-5.6-4.7s-5.6 2.1-5.6 4.7 2.5 4.7 5.6 4.7c.6 0 1.3-.1 1.9-.3l1.8.9-.5-1.5c1.4-.9 2.4-2.2 2.4-3.8zm-7.4-1a.7.7 0 110 1.4.7.7 0 010-1.4zm3.6 0a.7.7 0 110 1.4.7.7 0 010-1.4z"/>',
  apple:
    '<path d="M16.4 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.2-1.5 2.7-.4 6.6 1.1 8.8.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.1 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4 0 0-2.2-.9-2.2-3.7zM14.3 5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z"/>',

  // —— 主题 / 颜色 ——
  // 手柄在上、刷毛朝下
  brush:
    '<path d="M6 10h4V5.5a1 1 0 011-1h2a1 1 0 011 1V10h4a1 1 0 011 1v9H6v-9a1 1 0 011-1z"/><path d="M6 14h12M9 17v3M12 17v3M15 17v3"/>',
  // 刷毛朝上 (在 SVG 内部旋转 180°)
  'brush-up':
    '<g transform="rotate(180 12 12)"><path d="M6 10h4V5.5a1 1 0 011-1h2a1 1 0 011 1V10h4a1 1 0 011 1v9H6v-9a1 1 0 011-1z"/><path d="M6 14h12M9 17v3M12 17v3M15 17v3"/></g>',

  // 描边调色盘
  // 外轮廓：继承父级 stroke="currentColor"
  // 颜料点：单独使用 fill="currentColor"
  'palette-line':
    '<path d="M12 3C6.5 3 2.5 6.6 2.5 11.2c0 4.4 3.7 7.8 8.2 7.8h1.1c1.1 0 1.8-.8 1.8-1.8 0-.6-.3-1.1-.7-1.5-.5-.4-.7-.9-.7-1.5 0-1.3 1.1-2.3 2.4-2.3H17c2.5 0 4.5-1.8 4.5-4.1C21.5 5.1 17.3 3 12 3Z"/>' +
    '<circle cx="7.2" cy="9.2" r="1" fill="currentColor" stroke="none"/>' +
    '<circle cx="9.3" cy="6.5" r="1" fill="currentColor" stroke="none"/>' +
    '<circle cx="13" cy="5.8" r="1" fill="currentColor" stroke="none"/>' +
    '<circle cx="16.2" cy="7.2" r="1" fill="currentColor" stroke="none"/>',

  // 填充调色盘
  // 使用 evenodd 把四个颜料点真正“挖空”。
  // 挖空部分是透明的，因此深色模式下也不会出现白点问题。
  'palette-fill':
    '<path fill="currentColor" stroke="none" fill-rule="evenodd" clip-rule="evenodd" d="' +
    'M12 3C6.5 3 2.5 6.6 2.5 11.2c0 4.4 3.7 7.8 8.2 7.8h1.1c1.1 0 1.8-.8 1.8-1.8 0-.6-.3-1.1-.7-1.5-.5-.4-.7-.9-.7-1.5 0-1.3 1.1-2.3 2.4-2.3H17c2.5 0 4.5-1.8 4.5-4.1C21.5 5.1 17.3 3 12 3Z' +
    'M7.2 8.2a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z' +
    'M9.3 5.5a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z' +
    'M13 4.8a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z' +
    'M16.2 6.2a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z' +
    '"/>',

  // 调色盘 + 画笔
  // 风格接近截图中右上角的“调色盘带斜画笔”图标。
  'palette-brush':
    '<path d="M12 3.2C6.8 3.2 3 6.6 3 10.9c0 4.1 3.4 7.3 7.6 7.3h1c1 0 1.7-.7 1.7-1.6 0-.5-.2-1-.7-1.4-.4-.4-.6-.8-.6-1.3 0-1.2 1-2.1 2.2-2.1h1.7"/>' +
    '<circle cx="7.2" cy="9" r=".8" fill="currentColor" stroke="none"/>' +
    '<circle cx="9.5" cy="6.4" r=".8" fill="currentColor" stroke="none"/>' +
    '<circle cx="13" cy="5.8" r=".8" fill="currentColor" stroke="none"/>' +
    '<circle cx="16.2" cy="7.2" r=".8" fill="currentColor" stroke="none"/>' +
    '<path d="M14.6 18.1c1.2.2 2.3-.2 3.2-1.1l3.1-3.1"/>' +
    '<path d="M16.8 15.8L21.3 5.3"/>',
} as const;

// keyof typeof icons => 'user' | 'sparkle' | ... 的字面量联合类型。
// 好处：在 <AppIcon name="xxx" /> 里写错名字，vue-tsc 会直接报错、编辑器还能自动补全。
export type IconName = keyof typeof icons;

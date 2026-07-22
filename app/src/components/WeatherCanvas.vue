<template>
  <!-- 组件根就是 canvas 本身；ref 供 script 拿到 DOM 节点 -->
  <canvas ref="canvasEl" class="weather-canvas" />
</template>

<script setup lang="ts">
// Vue 组合式 API：onMounted 建资源、onBeforeUnmount 销毁、ref 拿模板节点、watch 监听 prop
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

// 天气枚举：组件内部严格三态（后端 condition 是自由字符串，进来前先 map 成这个）
type WeatherCondition = 'sunny' | 'cloudy' | 'rainy';

// props：withDefaults 给 defineProps 的可选项补默认值
const props = withDefaults(
  defineProps<{
    condition?: WeatherCondition;
    colliderEl?: HTMLElement | null; // 读 .hero__card 上沿做碰撞
    animating?: boolean; // 全屏 FLIP 动画进行中
    daylight?: number; // ★ 0..1，夜里淡出太阳
  }>(),
  { condition: 'sunny', colliderEl: null, animating: false, daylight: 1 },
);

// 【S1】模板 ref：<canvas ref="canvasEl"> ↔ 这里；.value 才是真正的 DOM 节点，挂载后才非空
const canvasEl = ref<HTMLCanvasElement | null>(null);

// ------ GL 与循环状态：故意用普通 let，不用 ref ------
// 这些每帧都改，做成响应式只会白白触发 Vue 追踪、零收益。只有要驱动模板的才用 ref。
let gl: WebGL2RenderingContext | null = null; // 【WebGL2】上下文类型是 WebGL2RenderingContext（WebGL1 是 WebGLRenderingContext）
let rafId = 0; // requestAnimationFrame 句柄；0 = 未在跑（startLoop/stopLoop 靠它判幂等）
let lastTime = 0; // 上一帧时刻（算 dt）
let startTime = 0; // 首帧时刻（算淡入/时间）
let dpr = 1; // 设备像素比（cap 到 2）
let cssW = 0; // hero CSS px 宽（仿真/映射用）
let cssH = 0;

// ------ 暂停闸门的三个输入（B 模式无 keep-alive，故没有 active）------
let visible = true; // 标签页是否可见（visibilitychange）
let intersecting = true; // HERO 是否在视口（IntersectionObserver）
let motionOk = true; // 是否允许动效（!prefers-reduced-motion）

// ---- 观察者/监听器句柄：销毁时要逐个断开 ----
let ro: ResizeObserver | null = null;
let io: IntersectionObserver | null = null;
let mq: MediaQueryList | null = null;

// ==================== sunny ====================
let program: WebGLProgram | null = null; // 链接后的可执行着色器程序
let vao: WebGLVertexArrayObject | null = null; // 【WebGL2】顶点数组对象：录下“顶点输入布局”
let vbo: WebGLBuffer | null = null; // 顶点缓冲：存那 3 个顶点坐标

// uniform 位置缓存：只在 initGL 查一次，绝不每帧查（查表烧 CPU）
let uColorLoc: WebGLUniformLocation | null = null; // 效果主色
let uFadeLoc: WebGLUniformLocation | null = null; // 0→1 淡入
let uModeLoc: WebGLUniformLocation | null = null; // 0 淡色调 / 1 太阳
let uTimeLoc: WebGLUniformLocation | null = null; // 时间（光柱游动）
let uResLoc: WebGLUniformLocation | null = null; // 分辨率（纵横比校正）
let uSunLoc: WebGLUniformLocation | null = null; // 太阳位置
let uDaylightLoc: WebGLUniformLocation | null = null; // 太阳亮度系数（随时间变化）

const SUN_POS: [number, number] = [0.8, 0.82]; // 太阳位置（uv 空间，右上，避开人脸）

// ==================== rainy ====================
let rainProgram: WebGLProgram | null = null;
let rainVao: WebGLVertexArrayObject | null = null;
let rainQuadBuf: WebGLBuffer | null = null;
let rainInstBuf: WebGLBuffer | null = null;
let uRainResLoc: WebGLUniformLocation | null = null;
let uRainFadeLoc: WebGLUniformLocation | null = null;
let uRainLenLoc: WebGLUniformLocation | null = null;
let uRainWidLoc: WebGLUniformLocation | null = null;

const RAIN_COUNT = 60;
const RAIN_LEN = 16;
const RAIN_WID = 1.6;
const RAIN_VX = -40; // 风（px/s）
const RAIN_VY_MIN = 180; // 初速调小，靠重力加速
const RAIN_VY_MAX = 320;
const RAIN_G = 1800; // 重力（px/s²）
const RAIN_E = 0.15; // 恢复系数
let rainInst = new Float32Array(0);
let rainSeeded = false;

// ------ 碰撞线（canvas-local px）：y=edgeY, x∈[edgeL,edgeR] ------
let edgeY = Infinity; // Infinity = 无碰撞体，雨照常落到底
let edgeL = 0;
let edgeR = 0;

// ==================== splash（命中水花，gl.POINTS）====================
let splashProgram: WebGLProgram | null = null;
let splashVao: WebGLVertexArrayObject | null = null;
let splashBuf: WebGLBuffer | null = null;
let uSplashResLoc: WebGLUniformLocation | null = null;
let uSplashSizeLoc: WebGLUniformLocation | null = null;

const SPLASH_MAX = 220; // 池子大小
const SPLASH_PER_HIT = 3; // 每次命中喷几粒
const SPLASH_SIZE = 5; // 基础点大小（css px）
const SPLASH_LIFE = 0.45; // 寿命（秒）
const SPLASH_G = 2200; // 水花重力（px/s²）
let splashState = new Float32Array(SPLASH_MAX * 5); // [x,y,vx,vy,life]/粒
let splashCursor = 0; // 环形写指针（覆盖最旧的）

// =======================================================================
// 着色器（GLSL ES 3.00）
// =======================================================================
const VERT = `#version 300 es
in vec2 aPos;                          // 【WebGL2】顶点属性入口，用 in 取代 WebGL1 的 attribute
out vec2 vUv;                          // 【WebGL2】传片元的 varying，用 out 取代 WebGL1 的 varying
void main() {
  vUv = aPos * 0.5 + 0.5;              // clip[-1,1] → uv[0,1]，给片元用
  gl_Position = vec4(aPos, 0.0, 1.0);  // 直接输出 clip space（全屏 pass，无 MVP）
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform vec3  uColor;
uniform float uFade;
uniform float uMode;      // 0 淡色调(rainy 底) / 1 太阳 / 2 云
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uSunPos;
uniform float uDaylight;  // 0..1：夜里把太阳淡出

// —— 柔和太阳：亮核 + 大辉光 + 极淡光柱 ——
float sunLight(vec2 uv) {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 s = vec2(uSunPos.x * aspect, uSunPos.y);
  float r = length(p - s);
  float hot  = exp(-r * r / (2.0 * 0.10 * 0.10));   // 亮核
  float core = exp(-r * r / (2.0 * 0.34 * 0.34));   // 柔和大辉光（主）
  float ang  = atan(p.y - s.y, p.x - s.x);
  float rays = pow(0.5 + 0.5 * sin(ang * 9.0 + uTime * 0.15), 3.0) // pow 从 5/7 降到 3
             * smoothstep(0.05, 0.5, r) * exp(-r * 1.4) * 0.12;     // ×0.12：光柱很淡
  return hot * 0.6 + core * 0.9 + rays;
}

// —— 云：value noise + fbm ——
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++){ v += amp * vnoise(p); p *= 2.0; amp *= 0.5; }
  return v;
}

// void main() {
//   if (uMode < 0.5) {
//     // 淡色调兜底（非晴天先用它占位）
//     float v = mix(0.55, 1.0, vUv.y);                     // 上亮下暗，证明 uv 方向
//     frag = vec4(uColor, uFade * 0.18 * v);               // 直通 alpha（配 premultipliedAlpha:false）
//   } else {
//     // 太阳
//     float L = sunLight(vUv);
//     vec3 col = mix(uColor, vec3(1.0), smoothstep(0.5, 1.0, L)); // 芯部偏白热
//     float a = clamp(L * uFade, 0.0, 0.72);               // 封顶 alpha，别糊住照片
//     frag = vec4(col, a);
//   }
// }

// void main() {
//   if (uMode < 0.5) {
//     float v = mix(0.55, 1.0, vUv.y);
//     float a = uFade * 0.18 * v;
//     a *= uDaylight;
//     frag = vec4(uColor * a, a);        // ← 预乘
//   } else {
//     float L = sunLight(vUv);
//     vec3 col = mix(uColor, vec3(1.0), smoothstep(0.5, 1.0, L));
//     float a = clamp(L * uFade, 0.0, 0.72);
//     a *= uDaylight;
//     frag = vec4(col * a, a);           // ← 预乘
//   }
// }
  void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  if (uMode < 0.5) {
    // rainy 底：淡色调
    float v = mix(0.55, 1.0, vUv.y);
    float a = uFade * 0.18 * v;
    frag = vec4(uColor * a, a);
  } else if (uMode < 1.5) {
    // 太阳
    float L = sunLight(vUv);
    vec3 col = mix(uColor, vec3(1.0), smoothstep(0.5, 1.0, L));
    float a = clamp(L * uFade, 0.0, 0.70) * uDaylight; // 夜里 uDaylight→0，太阳消失
    frag = vec4(col * a, a);
  } else {
    // 云（缓慢横向飘，只在上部天空区，避免糊住人）
    vec2 uv2 = vec2(vUv.x * aspect, vUv.y) * 2.2;
    uv2.x += uTime * 0.1;
    // float clouds = smoothstep(0.5, 0.95, fbm(uv2));
    float clouds = smoothstep(0.35, 0.8, fbm(uv2));
    // float topMask = smoothstep(0.25, 0.8, vUv.y);      // 底部无云
    float topMask = smoothstep(0.55, 0.95, vUv.y); // 只在最上面 ~45% 出云
    float a = clouds * topMask * uFade * 0.8;
    frag = vec4(vec3(1.0) * a, a);                     // 半透明白云（预乘）
  }
}
`;

const RAIN_VERT = `#version 300 es
layout(location = 0) in vec2 aCorner;   // 基础 quad 角(divisor 0)
layout(location = 1) in vec2 aPos;      // 每滴位置 px(divisor 1)
layout(location = 2) in vec2 aVel;      // 每滴速度 px/s(divisor 1)
uniform vec2  uResPx;
uniform float uLen;
uniform float uWid;
out vec2 vCorner;
void main() {
  vec2 dir  = normalize(aVel + vec2(0.0, 1e-4));
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 posPx = aPos + perp * (aCorner.x * uWid) - dir * (aCorner.y * uLen);
  vec2 clip = vec2(posPx.x / uResPx.x * 2.0 - 1.0,
                   1.0 - posPx.y / uResPx.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  vCorner = aCorner;
}`;

const RAIN_FRAG = `#version 300 es
precision highp float;
in vec2 vCorner;
out vec4 frag;
uniform float uFade;
void main() {
  float edge  = smoothstep(0.5, 0.0, abs(vCorner.x));
  float taper = 1.0 - vCorner.y;
  float a = edge * taper * 0.55 * uFade;
  // frag = vec4(0.85, 0.90, 1.0, a);
  frag = vec4(vec3(0.9, 0.95, 1.0) * a * 1.2  , a); 
  // frag = vec4(1.0, 0.0, 0.0, 1.0);
}`;

const SPLASH_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;    // 粒子位置 px
layout(location = 1) in float aLife;  // 剩余寿命 0..1
uniform vec2  uResPx;
uniform float uSize;                  // 基础点大小（device px）
out float vLife;
void main() {
  vec2 clip = vec2(aPos.x / uResPx.x * 2.0 - 1.0, 1.0 - aPos.y / uResPx.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = uSize * max(aLife, 0.0);   // 越接近死，点越小
  vLife = aLife;
}`;

const SPLASH_FRAG = `#version 300 es
precision highp float;
in float vLife;
out vec4 frag;
void main() {
  float d = length(gl_PointCoord - 0.5);                       // 点精灵内坐标 → 到中心距离
  float a = smoothstep(0.5, 0.0, d) * clamp(vLife, 0.0, 1.0);  // 圆形软边 × 寿命淡出
  frag = vec4(vec3(0.9, 0.95, 1.0) * a, a);                    // 预乘（和其它一致）
}`;

// 按天气给主色（sunny 暖 / rainy 冷蓝 / cloudy 灰）
function colorFor(c: WeatherCondition): [number, number, number] {
  switch (c) {
    case 'sunny':
      return [1.0, 0.83, 0.5];
    case 'rainy':
      return [0.45, 0.55, 0.75];
    default:
      return [0.7, 0.72, 0.76];
  }
}

// =======================================================================
// compile：编译单个 shader，失败打印驱动日志（注意判定要带 !）
// =======================================================================
function compile(g: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = g.createShader(type)!;
  g.shaderSource(s, src);
  g.compileShader(s);
  if (!g.getShaderParameter(s, g.COMPILE_STATUS)) console.error(g.getShaderInfoLog(s));
  return s;
}
function buildProgram(vSrc: string, fSrc: string): WebGLProgram {
  const g = gl!;
  const vs = compile(g, g.VERTEX_SHADER, vSrc);
  const fs = compile(g, g.FRAGMENT_SHADER, fSrc);
  const p = g.createProgram();
  g.attachShader(p, vs);
  g.attachShader(p, fs);
  g.linkProgram(p);
  if (!g.getProgramParameter(p, g.LINK_STATUS)) console.error(g.getProgramInfoLog(p));
  g.deleteShader(vs);
  g.deleteShader(fs);
  return p;
}

// =======================================================================
// initGL：天空 program + 全屏三角，然后 initRain()
// =======================================================================
function initGL(): boolean {
  const canvas = canvasEl.value;
  if (!canvas) return false;

  // 【WebGL2】'webgl2' 才拿到 WebGL2 上下文；第二参是上下文属性（都是“怎么和页面合成/分配缓冲”）
  gl = canvas.getContext('webgl2', {
    alpha: true, // canvas 带 alpha，透明处透出背后 CSS 渐变/照片（叠加层必需）
    premultipliedAlpha: true, // true: 全线改用"预乘 alpha"这条路(默认、各浏览器都稳);false: 我们自己输出“直通 alpha”，告诉合成器别当预乘
    antialias: false, // 关 MSAA：边缘自己在 shader 里 smoothstep 控，省 fill-rate
    depth: false, // 不分配深度缓冲：纯 2D 叠加不需要，省显存/带宽
    stencil: false, // 不分配模板缓冲：没用到
  });
  if (!gl) {
    console.warn('[WeatherCanvas] WebGL2 不可用 → 降级为纯 CSS 渐变'); // 降级不抛异常，装饰层不能拖崩页面
    return false;
  }

  // ---- 编译 + 链接 program ----
  program = buildProgram(VERT, FRAG);

  // ---- 缓存 uniform 位置（必须在 linkProgram 之后，否则报 program not linked）----
  uColorLoc = gl.getUniformLocation(program, 'uColor');
  uFadeLoc = gl.getUniformLocation(program, 'uFade');
  uModeLoc = gl.getUniformLocation(program, 'uMode');
  uTimeLoc = gl.getUniformLocation(program, 'uTime');
  uResLoc = gl.getUniformLocation(program, 'uResolution');
  uSunLoc = gl.getUniformLocation(program, 'uSunPos');
  uDaylightLoc = gl.getUniformLocation(program, 'uDaylight');

  // ---- 全屏三角的 VAO/VBO ----
  const verts = new Float32Array([-1, -1, 3, -1, -1, 3]); // 超大三角，覆盖 [-1,1] 屏幕，多余被裁
  vao = gl.createVertexArray(); // 【WebGL2】建 VAO（WebGL1 要 OES_vertex_array_object 扩展）
  gl.bindVertexArray(vao); // 【WebGL2】开始“录制”：之后的属性配置都记进这个 VAO
  vbo = gl.createBuffer(); // 建 GPU buffer 句柄
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo); // 绑到 ARRAY_BUFFER 槽（顶点数据槽）
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW); // 上传数据；STATIC_DRAW=提示几乎不改
  const loc = gl.getAttribLocation(program, 'aPos'); // 查 aPos 属性的通道号
  gl.enableVertexAttribArray(loc); // 打开该通道：从 buffer 读，不是用常量
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); // 解释布局：2 个 float/顶点，紧密排列，偏移 0
  gl.bindVertexArray(null); // 结束录制、解绑，防误改

  initRain(); // 雨的 GL 资源
  initSplash(); // 水花的 GL 资源

  return true;
}

// =======================================================================
// initRain：雨 program + VAO（基础 quad divisor0 + 实例数据 divisor1）
// =======================================================================
function initRain() {
  const g = gl!;
  rainProgram = buildProgram(RAIN_VERT, RAIN_FRAG);
  uRainResLoc = g.getUniformLocation(rainProgram, 'uResPx');
  uRainFadeLoc = g.getUniformLocation(rainProgram, 'uFade');
  uRainLenLoc = g.getUniformLocation(rainProgram, 'uLen');
  uRainWidLoc = g.getUniformLocation(rainProgram, 'uWid');

  rainInst = new Float32Array(RAIN_COUNT * 4); // [x,y,vx,vy]/滴

  rainVao = g.createVertexArray();
  g.bindVertexArray(rainVao);
  rainQuadBuf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, rainQuadBuf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-0.5, 0, 0.5, 0, -0.5, 1, 0.5, 1]), g.STATIC_DRAW);
  g.enableVertexAttribArray(0);
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  rainInstBuf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, rainInstBuf);
  g.bufferData(g.ARRAY_BUFFER, rainInst, g.DYNAMIC_DRAW);
  g.enableVertexAttribArray(1);
  g.vertexAttribPointer(1, 2, g.FLOAT, false, 16, 0); // aPos
  g.vertexAttribDivisor(1, 1);
  g.enableVertexAttribArray(2);
  g.vertexAttribPointer(2, 2, g.FLOAT, false, 16, 8); // aVel
  g.vertexAttribDivisor(2, 1);
  g.bindVertexArray(null);
}

// =======================================================================
// initSplash：
// =======================================================================
function initSplash() {
  const g = gl!;
  splashProgram = buildProgram(SPLASH_VERT, SPLASH_FRAG);
  uSplashResLoc = g.getUniformLocation(splashProgram, 'uResPx');
  uSplashSizeLoc = g.getUniformLocation(splashProgram, 'uSize');
  splashState = new Float32Array(SPLASH_MAX * 5);

  splashVao = g.createVertexArray();
  g.bindVertexArray(splashVao);
  splashBuf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, splashBuf);
  g.bufferData(g.ARRAY_BUFFER, splashState, g.DYNAMIC_DRAW);
  g.enableVertexAttribArray(0);
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 20, 0); // aPos：stride 5*4=20，offset 0
  g.enableVertexAttribArray(1);
  g.vertexAttribPointer(1, 1, g.FLOAT, false, 20, 16); // aLife：offset 4*4=16
  g.bindVertexArray(null);
}

// 粒子池：seed / respawn（用 cssW/cssH，resize 后才能调）
function respawnDrop(i: number, initial = false) {
  const o = i * 4;
  rainInst[o] = Math.random() * cssW;
  rainInst[o + 1] = initial ? Math.random() * cssH : -Math.random() * cssH * 0.2 - RAIN_LEN;
  rainInst[o + 2] = RAIN_VX + (Math.random() - 0.5) * 40;
  rainInst[o + 3] = RAIN_VY_MIN + Math.random() * (RAIN_VY_MAX - RAIN_VY_MIN);
}
function seedRain() {
  for (let i = 0; i < RAIN_COUNT; i++) respawnDrop(i, true);
  rainSeeded = true;
}

// 读 .hero__card 上沿 → canvas-local px（只在 resize 调）
function updateCollider() {
  const el = props.colliderEl;
  const canvas = canvasEl.value;
  if (!el || !canvas) {
    edgeY = Infinity;
    return;
  }
  const cr = el.getBoundingClientRect();
  const kr = canvas.getBoundingClientRect();
  edgeY = cr.top - kr.top;
  edgeL = cr.left - kr.left;
  edgeR = edgeL + cr.width;
}

// CPU 积分 + 重力 + 碰撞回弹 + 回收 + 上传
function updateRain(dt: number) {
  const g = gl!;
  for (let i = 0; i < RAIN_COUNT; i++) {
    const o = i * 4;
    rainInst[o + 3]! += RAIN_G * dt; // ★S4 重力：vy += g*dt
    const prevY = rainInst[o + 1]!; // ★S4 更新前 y
    rainInst[o]! += rainInst[o + 2]! * dt; // x += vx*dt
    rainInst[o + 1]! += rainInst[o + 3]! * dt; // y += vy*dt
    const x = rainInst[o]!;
    const y = rainInst[o + 1]!;
    // ★S4 碰撞：本帧从上方穿过卡片上沿 + 横向命中
    if (prevY < edgeY && y >= edgeY && x >= edgeL && x <= edgeR) {
      rainInst[o + 1] = edgeY; // 顶回线上
      rainInst[o + 3] = -rainInst[o + 3]! * RAIN_E; // vy 反向 * 恢复系数
      rainInst[o + 2]! += (Math.random() - 0.5) * 120; // 切向散射
      spawnSplash(x, edgeY); // 命中点喷水花
    }
    if (rainInst[o + 1]! > cssH + RAIN_LEN) respawnDrop(i); // 越界回收
  }
  g.bindBuffer(g.ARRAY_BUFFER, rainInstBuf);
  g.bufferSubData(g.ARRAY_BUFFER, 0, rainInst);
}

// 命中时喷几粒（环形覆盖最旧的，池子不增长）
function spawnSplash(px: number, py: number) {
  for (let k = 0; k < SPLASH_PER_HIT; k++) {
    const o = splashCursor * 5;
    splashState[o] = px;
    splashState[o + 1] = py;
    splashState[o + 2] = (Math.random() - 0.5) * 260; // vx：向两边散
    splashState[o + 3] = -120 - Math.random() * 200; // vy：向上溅（负=上）
    splashState[o + 4] = 1; // 满寿命
    splashCursor = (splashCursor + 1) % SPLASH_MAX;
  }
}

// CPU 积分 + 重力 + 寿命递减 + 上传（死的跳过）
function updateSplash(dt: number) {
  const g = gl!;
  for (let i = 0; i < SPLASH_MAX; i++) {
    const o = i * 5;
    if (splashState[o + 4]! <= 0) continue; // 死粒子跳过（gl_PointSize=0 也画不出）
    splashState[o + 3]! += SPLASH_G * dt; // vy += g*dt
    splashState[o]! += splashState[o + 2]! * dt; // x += vx*dt
    splashState[o + 1]! += splashState[o + 3]! * dt; // y += vy*dt
    splashState[o + 4]! -= dt / SPLASH_LIFE; // 寿命 1→0
  }
  g.bindBuffer(g.ARRAY_BUFFER, splashBuf);
  g.bufferSubData(g.ARRAY_BUFFER, 0, splashState);
}

// =======================================================================
// resize：DPR + 记 cssW/cssH + seed + 碰撞线
// =======================================================================
function resize() {
  const canvas = canvasEl.value;
  if (!canvas || !gl) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  cssW = w;
  cssH = h;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
    gl.viewport(0, 0, bw, bh);
  }
  if (!rainSeeded) seedRain(); // 拿到尺寸后 seed
  if (!props.animating) updateCollider(); // 重算碰撞线
  if (rafId === 0) draw(1, 0);
}

// =======================================================================
// draw：天空（太阳/淡色调）
// =======================================================================
function draw(fade: number, t: number) {
  if (!gl || !program) return;
  const canvas = canvasEl.value!;
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  const [r, g, b] = colorFor(props.condition);
  gl.uniform3f(uColorLoc, r, g, b);
  gl.uniform1f(uFadeLoc, fade);
  // gl.uniform1f(uModeLoc, props.condition === 'sunny' ? 1 : 0);
  const mode = props.condition === 'sunny' ? 1 : props.condition === 'cloudy' ? 2 : 0;
  gl.uniform1f(uModeLoc, mode); // 0 淡色调(雨底) / 1 太阳 / 2 云
  gl.uniform1f(uDaylightLoc, props.daylight);
  gl.uniform1f(uTimeLoc, t);
  gl.uniform2f(uResLoc, canvas.width, canvas.height);
  gl.uniform2f(uSunLoc, SUN_POS[0], SUN_POS[1]);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

// drawRain：alpha 混合 + 一次 instanced 画 N 条
function drawRain(fade: number) {
  const g = gl!;
  g.useProgram(rainProgram);
  g.uniform2f(uRainResLoc, cssW, cssH);
  g.uniform1f(uRainFadeLoc, fade);
  g.uniform1f(uRainLenLoc, RAIN_LEN);
  g.uniform1f(uRainWidLoc, RAIN_WID);
  g.enable(g.BLEND);
  // g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
  g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA); // 预乘 alpha 的 over（源不再乘一次 src.a）
  g.bindVertexArray(rainVao);
  g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, RAIN_COUNT);
  g.bindVertexArray(null);
  g.disable(g.BLEND);
}

function drawSplash() {
  const g = gl!;
  g.useProgram(splashProgram);
  g.uniform2f(uSplashResLoc, cssW, cssH);
  g.uniform1f(uSplashSizeLoc, SPLASH_SIZE * dpr); // 点大小要乘 dpr（gl_PointSize 是 device px）
  g.enable(g.BLEND);
  g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA); // 预乘 over（和雨一致）
  g.bindVertexArray(splashVao);
  g.drawArrays(g.POINTS, 0, SPLASH_MAX); // 每个顶点画一个点
  g.bindVertexArray(null);
  g.disable(g.BLEND);
}

// =======================================================================
// rAF 循环：天空 +（雨天）雨
// =======================================================================
function frame(now: number) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  const t = (now - startTime) / 1000;
  const fade = Math.min(t / 1.2, 1);
  draw(fade, t);
  if (props.condition === 'rainy' && rainSeeded) {
    updateRain(dt);
    drawRain(fade);
    updateSplash(dt);
    drawSplash();
  }
}

function startLoop() {
  if (rafId !== 0) return; // 幂等：已在跑就不起第二条 rAF
  lastTime = performance.now(); // ★恢复必重置，否则首帧 dt=停了多久 → 物理爆炸
  if (startTime === 0) startTime = lastTime;
  rafId = requestAnimationFrame(frame);
}
function stopLoop() {
  if (rafId === 0) return;
  cancelAnimationFrame(rafId); // 取消已约的下一帧
  rafId = 0;
}

function evaluate() {
  const base = visible && intersecting; // 可见 且 在视口
  if (base && motionOk) {
    startLoop(); // 允许动效 → 跑
  } else {
    stopLoop();
    if (base && !motionOk) draw(1, 0); // reduced-motion：只画一帧静态，不空白
  }
}

// =======================================================================
// 事件源：各改各的 flag → evaluate()
// =======================================================================
function onVisibility() {
  visible = document.visibilityState === 'visible'; // 'visible' | 'hidden'
  evaluate();
}
function onMotionChange(e: MediaQueryListEvent) {
  motionOk = !e.matches; // e 绑定在 reduced-motion 的 MQL 上；matches=用户要减弱动效
  evaluate();
}

watch(
  () => props.condition,
  () => {
    /**
     * condition 变了：动画中下一帧自动生效；静止时补画一帧
     *
     * 这个 watch 不负责"要不要跑",只负责"内容变了、屏幕需不需要补刷一帧"。这两件事是正交的:
     *
     * "要不要跑"由 evaluate() 那套闸门(visible/intersecting/motionOk)决定。
     * condition 只改"画什么"(颜色/mode),不改"跑不跑"。晴转雨并不会让你更可见、或更需要减弱动效——所以 condition 变化根本不该去碰那三个 flag,碰了反而逻辑混。
     */
    if (rafId === 0) draw(1, 0);
  },
);

watch(
  () => props.animating,
  (animating) => {
    if (!animating) {
      updateCollider();
    }
  },
);

// =======================================================================
// onMounted：建 GL、建观察者、注册监听、初次 evaluate
// =======================================================================
onMounted(() => {
  if (!initGL()) return; // 拿不到 GL：降级返回，CSS 渐变兜底
  mq = window.matchMedia('(prefers-reduced-motion: reduce)'); // 建一次，返回 MediaQueryList

  motionOk = !mq.matches; // 读初值(复用 mq)
  visible = document.visibilityState === 'visible';

  resize(); // 先同步定一次尺寸，避免首帧用默认 300×150

  ro = new ResizeObserver(() => resize()); // 元素尺寸变（非 window.resize）
  ro.observe(canvasEl.value!); // 观察 canvas 自身盒（= inset:0 撑满的 .hero 内框）

  io = new IntersectionObserver(
    (entries) => {
      intersecting = entries[0]?.isIntersecting ?? true; // HERO 进/出视口
      evaluate();
    },
    { threshold: 0 },
  );
  // 标签页明明可见,但 HERO 滚出了屏幕：在首页往下滚到"动作行",HERO 已经不在视口
  io.observe(canvasEl.value!);

  // 订阅【将来】的变化
  mq.addEventListener('change', onMotionChange); // 系统设置改时通知

  // 整个标签页/App 被隐藏：切到别的浏览器标签、最小化、App 退后台
  document.addEventListener('visibilitychange', onVisibility);

  evaluate();
  // ↓ 方案 A（keep-alive）时在此补：
  //   onActivated(() => { active = true;  evaluate(); });
  //   onDeactivated(() => { active = false; evaluate(); });  // 并把 evaluate 的 base 加上 && active
});

// =======================================================================
// onBeforeUnmount：严格顺序销毁（停帧 → 断观察者 → 删 GL → loseContext）
// =======================================================================
onBeforeUnmount(() => {
  stopLoop(); // ① 先停帧：之后没有任何一帧再碰将删的 GL 对象
  ro?.disconnect(); // ② 断观察者/监听
  io?.disconnect();
  mq?.removeEventListener('change', onMotionChange);
  document.removeEventListener('visibilitychange', onVisibility);
  if (gl) {
    gl.deleteBuffer(vbo); // ③ 删 GL 资源
    gl.deleteVertexArray(vao); // 【WebGL2】删 VAO
    gl.deleteProgram(program);
    gl.deleteBuffer(rainQuadBuf); // ★S3 雨资源
    gl.deleteBuffer(rainInstBuf);
    gl.deleteVertexArray(rainVao);
    gl.deleteProgram(rainProgram);
    gl.deleteBuffer(splashBuf);
    gl.deleteVertexArray(splashVao);
    gl.deleteProgram(splashProgram);
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // ④ 逼驱动立刻回收显存（iOS ~16 上下文上限）
  }
  gl = null;
  program = null;
  vao = null;
  vbo = null;
  rainProgram = null;
  rainVao = null;
  rainQuadBuf = null;
  rainInstBuf = null;
  splashProgram = null;
  splashVao = null;
  splashBuf = null;
});
</script>

<style scoped>
.weather-canvas {
  position: absolute;
  inset: 0;
  z-index: 0; /* 照片(z:0) 之上、状态行/毛玻璃卡(z:2) 之下 */
  display: block;
  pointer-events: none; /* 不吃点击，交互全归前景 */
}
</style>

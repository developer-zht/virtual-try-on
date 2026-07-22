import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router';

/** HERO 全屏模式对应的 URL 查询参数值。 */
export const HERO_FULLSCREEN_QUERY_VALUE = 'fullscreen';

/** FLIP 动画所需的元素位置和尺寸。 */
export interface RectLike {
  /** 元素左边缘相对视口的位置。 */
  left: number;

  /** 元素上边缘相对视口的位置。 */
  top: number;

  /** 元素宽度。 */
  width: number;

  /** 元素高度。 */
  height: number;
}

/** `useHeroFullscreen` 的配置项。 */
export interface UseHeroFullscreenOptions {
  /** HERO 元素引用。 */
  heroEl: Ref<HTMLElement | null>;

  /** 当前是否允许打开全屏 HERO。 */
  canOpen: Readonly<Ref<boolean>>;
}

/**
 * 判断路由查询参数是否请求打开 HERO 全屏模式。
 *
 * @param query 当前路由查询参数
 * @returns `hero=fullscreen` 时返回 `true`
 */
export function hasHeroFullscreenQuery(query: LocationQuery): boolean {
  return query.hero === HERO_FULLSCREEN_QUERY_VALUE;
}

/**
 * 向查询参数中添加 HERO 全屏标记。
 *
 * 不会修改原查询参数对象。
 *
 * @param query 当前路由查询参数
 * @returns 包含 `hero=fullscreen` 的新查询参数
 */
export function addHeroFullscreenQuery(query: LocationQuery): LocationQueryRaw {
  return { ...query, hero: HERO_FULLSCREEN_QUERY_VALUE };
}

/**
 * 从查询参数中移除 HERO 全屏标记。
 *
 * 不会修改原查询参数对象。
 *
 * @param query 当前路由查询参数
 * @returns 移除 `hero` 后的新查询参数
 */
export function removeHeroFullscreenQuery(query: LocationQuery): LocationQueryRaw {
  const next: LocationQueryRaw = { ...query };
  delete next.hero;
  return next;
}

/**
 * 决定关闭 HERO 全屏模式时使用的路由操作。
 *
 * 当前页面主动压入过全屏历史记录时使用 `back`；
 * 否则使用 `replace` 移除查询参数。
 *
 * @param ownsHistoryEntry 当前实例是否创建了全屏历史记录
 */
export function heroCloseStrategy(ownsHistoryEntry: boolean): 'back' | 'replace' {
  return ownsHistoryEntry ? 'back' : 'replace';
}

/**
 * 将数值保留到小数点后四位，减少动画矩阵中的浮点噪声。
 */
function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * 根据 FLIP 动画的初始和最终矩形生成关键帧。
 *
 * 初始关键帧通过位移和缩放，让最终布局暂时显示在旧位置；
 * 最终关键帧恢复到当前布局的实际位置和尺寸。
 *
 * @param first 动画前的位置和尺寸
 * @param last 动画后的位置和尺寸
 * @param firstRadius 动画前的圆角
 * @param lastRadius 动画后的圆角
 * @returns Web Animations API 使用的起止关键帧
 */
export function createFlipKeyframes(
  first: RectLike,
  last: RectLike,
  firstRadius: string,
  lastRadius: string,
): [Keyframe, Keyframe] {
  const scaleX = last.width > 0 ? rounded(first.width / last.width) : 1;
  const scaleY = last.height > 0 ? rounded(first.height / last.height) : 1;
  const deltaX = rounded(first.left - last.left);
  const deltaY = rounded(first.top - last.top);

  return [
    {
      transformOrigin: 'top left',
      transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
      borderRadius: firstRadius,
    },
    {
      transformOrigin: 'top left',
      transform: 'translate(0px, 0px) scale(1, 1)',
      borderRadius: lastRadius,
    },
  ];
}

/**
 * 将只读的 `DOMRect` 复制为普通矩形对象。
 */
function copyRect(rect: DOMRect): RectLike {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 管理 HERO 全屏状态、路由参数及 FLIP 过渡动画。
 *
 * 全屏状态由 URL 中的 `hero=fullscreen` 驱动，因此支持：
 * - 浏览器前进和后退
 * - 刷新后恢复状态
 * - 直接通过 URL 进入全屏模式
 *
 * @param options HERO 元素及打开条件
 */
export function useHeroFullscreen(options: UseHeroFullscreenOptions) {
  const route = useRoute();
  const router = useRouter();

  /** HERO 当前是否处于全屏布局。 */
  const isFullscreen = ref(false);

  /** HERO 当前是否正在执行 FLIP 动画。 */
  const isAnimating = ref(false);

  /** 当前路由是否请求 HERO 全屏模式。 */
  const routeRequestsFullscreen = computed(() => hasHeroFullscreenQuery(route.query));

  /**
   * 当前实例是否通过 `router.push` 创建了全屏历史记录。
   *
   * 用于决定关闭时执行 `router.back()` 还是 `router.replace()`。
   */
  let ownsHistoryEntry = false;

  /** 点击打开时提前记录的紧凑 HERO 矩形。 */
  let pendingFirstRect: RectLike | null = null;

  /** 当前正在运行的 Web Animations API 动画。 */
  let activeAnimation: Animation | null = null;

  /** 用于防止旧动画异步完成后覆盖新状态。 */
  let transitionId = 0;

  /**
   * 判断用户是否启用了“减少动态效果”。
   */
  function reducedMotion(): boolean {
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * 应用全屏或紧凑布局，并执行 FLIP 动画。
   *
   * @param next 目标全屏状态
   * @param firstOverride 可选的动画起始矩形
   */
  async function applyFullscreen(next: boolean, firstOverride?: RectLike | null) {
    const element = options.heroEl.value;
    if (!element || next === isFullscreen.value) return;

    const id = ++transitionId;
    const first = firstOverride ?? copyRect(element.getBoundingClientRect());
    const firstRadius = window.getComputedStyle(element).borderRadius;

    activeAnimation?.cancel();
    activeAnimation = null;

    isAnimating.value = true;
    isFullscreen.value = next;

    // 等待 Vue 根据新状态完成 DOM 布局更新。
    await nextTick();

    const last = copyRect(element.getBoundingClientRect());
    const lastRadius = window.getComputedStyle(element).borderRadius;

    if (reducedMotion() || typeof element.animate !== 'function') {
      if (id === transitionId) isAnimating.value = false;
      return;
    }

    const animation = element.animate(createFlipKeyframes(first, last, firstRadius, lastRadius), {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    });

    activeAnimation = animation;

    try {
      await animation.finished;
    } catch {
      // 路由反向切换时可能会主动取消尚未完成的动画。
    } finally {
      if (id === transitionId) {
        animation.cancel();
        activeAnimation = null;
        isAnimating.value = false;
      }
    }
  }

  /**
   * 根据路由查询参数同步 HERO 的全屏状态。
   *
   * 路由请求全屏且当前允许打开时进入全屏；
   * 路由不再请求全屏时恢复紧凑布局。
   */
  async function syncFromRoute() {
    if (routeRequestsFullscreen.value && options.canOpen.value) {
      const first = pendingFirstRect;
      pendingFirstRect = null;
      await applyFullscreen(true, first);
      return;
    }

    if (!routeRequestsFullscreen.value && isFullscreen.value) {
      await applyFullscreen(false);
    }
  }

  /**
   * 打开 HERO 全屏模式。
   *
   * ```text
   * 用户点击 HERO
   * → 确认元素存在
   * → 确认 Try-on 图片已经生成
   * → 记录紧凑 HERO 的位置和尺寸
   * → 向浏览器历史压入 ?hero=fullscreen
   * → 路由 watcher 收到变化
   * → 开始 FLIP 动画
   * ```
   *
   * `open` 本身只修改路由，不直接切换全屏状态；
   * 真正的布局切换由路由 watcher 调用 `syncFromRoute` 完成。
   */
  async function open() {
    const element = options.heroEl.value;

    if (!element || !options.canOpen.value || routeRequestsFullscreen.value) return;

    pendingFirstRect = copyRect(element.getBoundingClientRect());
    ownsHistoryEntry = true;

    await router.push({
      query: addHeroFullscreenQuery(route.query),
    });

    // 导航被守卫取消或重定向时，清理本次打开记录。
    if (!hasHeroFullscreenQuery(route.query)) {
      ownsHistoryEntry = false;
      pendingFirstRect = null;
    }
  }

  /**
   * 关闭 HERO 全屏模式。
   *
   * 当前实例创建过全屏历史记录时返回上一条记录；
   * 否则直接替换当前 URL，移除 `hero` 查询参数。
   */
  async function close() {
    if (!routeRequestsFullscreen.value && !isFullscreen.value) return;

    if (heroCloseStrategy(ownsHistoryEntry) === 'back') {
      ownsHistoryEntry = false;
      router.back();
      return;
    }

    await router.replace({
      query: removeHeroFullscreenQuery(route.query),
    });
  }

  /**
   * 在全屏模式下监听 Escape 键并关闭 HERO。
   */
  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isFullscreen.value) {
      void close();
    }
  }

  // 路由请求或打开条件改变后，同步全屏状态。
  watch([routeRequestsFullscreen, options.canOpen], () => void syncFromRoute(), {
    flush: 'post',
  });

  onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    void syncFromRoute();
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    activeAnimation?.cancel();
  });

  return {
    /** HERO 当前是否全屏。 */
    isFullscreen,

    /** HERO 当前是否正在执行动画。 */
    isAnimating,

    /** 请求打开 HERO 全屏模式。 */
    open,

    /** 请求关闭 HERO 全屏模式。 */
    close,
  };
}

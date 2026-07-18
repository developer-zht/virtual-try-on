<template>
  <div class="wardrobe">
    <PageHeader title="电子衣柜">
      <!-- 右上角：单个「+」，点开展开 拍照 / 相册 两个选项 -->
      <template #action v-if="!isEmpty">
        <div class="add-menu">
          <button
            class="fab"
            :class="{ 'fab--open': menuOpen }"
            aria-label="添加单品"
            @click="toggleMenu"
          >
            <!-- 纯 CSS 画的「+」；菜单打开时整体转 45° 变「×」 -->
            <span class="fab__plus"></span>
          </button>

          <div v-if="menuOpen" class="add-menu__pop">
            <button class="add-menu__item" @click="onPick('camera')">
              <AppIcon name="camera" :size="18" />
              <span>拍照</span>
            </button>
            <button class="add-menu__item" @click="onPick('album')">
              <AppIcon name="image" :size="18" />
              <span>相册</span>
            </button>
          </div>
        </div>
      </template>
    </PageHeader>

    <DemoHint>您可尝试添加和删除衣服</DemoHint>

    <!-- 菜单展开时的透明遮罩：点空白处关闭 -->
    <div v-if="menuOpen" class="add-menu__backdrop" @click="menuOpen = false"></div>

    <!-- 首次空态（wardrobe.isEmpty）：成对圆形动作（主拍照 + 次相册导入）-->
    <div v-if="isEmpty" class="empty">
      <div class="empty__actions">
        <div class="empty__action">
          <button class="circle circle--primary" aria-label="拍照" @click="onPick('camera')">
            <span class="circle__pulse"></span>
            <AppIcon name="camera" :size="44" />
          </button>
          <div class="empty__label">拍照</div>
          <div class="empty__sub">相机实拍</div>
        </div>
        <div class="empty__action">
          <button class="circle circle--ghost" aria-label="相册导入" @click="onPick('album')">
            <AppIcon name="image" :size="34" />
          </button>
          <div class="empty__label">相册导入</div>
          <div class="empty__sub">从已有照片</div>
        </div>
      </div>
      <div class="empty__title">拍下你的第一件单品</div>
      <div class="empty__desc">
        AI 会自动识别品类与颜色，帮你建立电子衣柜；单品越多，穿搭推荐越准。
      </div>
    </div>

    <!-- 非空：分类 + 网格 -->
    <template v-else>
      <!-- 分类：横向滚动胶囊。用稳定枚举 en 做筛选键，label 只负责显示 -->
      <div class="chips">
        <button
          v-for="cat in categories"
          :key="cat.en"
          class="chip"
          :class="{ 'chip--active': cat.en === activeCat }"
          @click="activeCat = cat.en"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- 2 列网格 -->
      <div class="grid">
        <div v-for="item in filteredItems" :key="item.id" class="item">
          <div class="item__thumb">
            <GarmentThumb :src="item.display_image_url" :icon-size="40" />
            <!-- 删除按钮：确认后调用 store.removeCloth（乐观删除 + 失败回滚）-->
            <!-- <button class="item__del" aria-label="删除单品" @click="onDelete(item.id)">
              <AppIcon name="trash" :size="16" />
            </button> -->
          </div>
          <div class="item__info">
            <div class="item__name">{{ item.category }}</div>
            <div v-if="item.primary_color" class="item__color">{{ item.primary_color }}</div>

            <!-- 删除按钮：确认后调用 store.removeCloth（乐观删除 + 失败回滚）-->
            <button class="item__del" aria-label="删除单品" @click="onDelete(item.id)">
              <AppIcon name="trash" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- 当前分类下没有单品时的占位 -->
      <div v-if="filteredItems.length === 0" class="grid-empty">该分类下暂无单品</div>
    </template>

    <!-- 隐藏文件输入：拍照(capture 提示直接开相机) / 相册 -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden-input"
      @change="onFile"
    />
    <input ref="albumInput" type="file" accept="image/*" class="hidden-input" @change="onFile" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import GarmentThumb from '@/components/GarmentThumb.vue';
import { useAuthStore } from '@/stores/auth';
import { useWardrobeStore } from '@/stores/wardrobe';
import { storeToRefs } from 'pinia';
import { useNotifyStore } from '@/stores/notify';
import DemoHint from '@/components/DemoHint.vue';

// 顶部分类标签：label 给用户看（中文），en 用来和后端稳定枚举 category_en 比对做筛选。
// 关键：不要拿后端返回的中文 category 字段来筛选——那是 AI 生成的自由文本，
// 和这里写死的中文对不上，也覆盖不全（后端有 6 类，旧代码只有 4 个 tag）。
// type CatFilter = CategoryEn | 'ALL';
// const categories: { label: string; en: CatFilter }[] = [
//   { label: '全部', en: 'ALL' },
//   { label: '上衣', en: 'TOPS' },
//   { label: '裤子', en: 'BOTTOMS' },
//   { label: '鞋履', en: 'SHOES' },
//   { label: '外套', en: 'OUTERWEAR' },
//   { label: '配饰', en: 'ACCESSORIES' },
//   { label: '包袋', en: 'BAGS' },
// ];
// 分类 tag 不写死：从已加载的衣物里“提炼”。activeCat 存当前选中的 category_en；'ALL' = 不筛选
const activeCat = ref<string>('ALL');

// 只影响展示顺序：列到的排前面，没列到的排最后（覆盖后端全部 13 类）
const CATEGORY_ORDER = [
  'TOPS',
  'BOTTOMS',
  'SKIRT',
  'DRESS',
  'OUTERWEAR',
  'SHOES',
  'BAGS',
  'BAG',
  'ACCESSORIES',
  'HEADWEAR',
  'SCARF',
  'BELT',
  'JEWELRY',
  'OTHER',
];

// 两个隐藏 <input type="file"> 的引用
const cameraInput = ref<HTMLInputElement | null>(null);
const albumInput = ref<HTMLInputElement | null>(null);

// 右上角「+」展开的相机/相册菜单开关
const menuOpen = ref(false);

const auth = useAuthStore();
const { loggedIn } = storeToRefs(auth);

const wardrobe = useWardrobeStore();
const { items, isEmpty, importing } = storeToRefs(wardrobe); // state/getter → storeToRefs
const { getClothes } = wardrobe;

onMounted(() => {
  if (auth.loggedIn) void getClothes();
});

watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    void getClothes();
  }
});

// 每件衣物自带 category_en（稳定筛选键）+ category（后端中文标签）；去重即“真实存在的分类”
const categories = computed(() => {
  const label = new Map<string, string>(); // category_en -> 中文
  for (const it of items.value) {
    if (!label.has(it.category_en)) label.set(it.category_en, it.category);
  }
  const tags = [...label]
    .map(([en, text]) => ({ en, label: text }))
    .sort((a, b) => rank(a.en) - rank(b.en));
  return [{ en: 'ALL', label: '全部' }, ...tags];
});
function rank(en: string) {
  const i = CATEGORY_ORDER.indexOf(en);
  return i === -1 ? 999 : i;
}

const filteredItems = computed(() =>
  activeCat.value === 'ALL'
    ? items.value
    : items.value.filter((i) => i.category_en === activeCat.value),
);

// 当前分类被删空（tag 消失）时自动回到「全部」，避免停在空列表
watch(categories, (cats) => {
  if (!cats.some((c) => c.en === activeCat.value)) activeCat.value = 'ALL';
});
function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

// 点拍照/相册：先关菜单，过登录闸门，再打开对应的系统文件选择
function onPick(source: 'camera' | 'album') {
  menuOpen.value = false;
  if (!auth.loggedIn) {
    auth.openAuth('register'); // 未登录 → 弹注册，不打开相机/相册
    return;
  }
  (source === 'camera' ? cameraInput : albumInput).value?.click();
}

const notify = useNotifyStore();
// 选好文件：交给 store 上传（store 内部轮询进度，全局 UploadToast 自动显示）
function onFile(e: Event) {
  console.log(importing.value);
  if (importing.value) {
    notify.warning('模型正在识别，请稍候上传');
    return;
  }
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 清空，允许下次再选同一张
  if (!file) return;
  void wardrobe.importFromFile(file);
}

// 删除：确认后交给 store 的 removeCloth（乐观移除 + 失败回滚）
async function onDelete(id: string) {
  const ok = await notify.confirm({
    title: '删除单品',
    message: '确定要从衣柜删除这件单品吗？此操作不可撤销。',
    okText: '删除',
    danger: true,
  });
  if (!ok) return;
  // removeCloth 失败会自己弹错误 toast，这里只在成功时提示
  if (await wardrobe.removeCloth(id)) notify.success('已删除');
}
</script>

<style scoped lang="scss">
.wardrobe {
  gap: 16px;
}

// 隐藏的原生文件输入（靠按钮 .click() 触发）
.hidden-input {
  display: none;
}

// ===== 右上角「+」展开菜单 =====
.add-menu {
  position: relative;
}

// 「+」主按钮
.fab {
  width: 40px;
  height: 40px;
  border: 1px solid var(--button-primary-border);
  border-radius: 50%;
  background: var(--gradient-button-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-cta);
  cursor: pointer;
  &:active {
    transform: scale(0.9);
  }
}
// 纯 CSS 画「+」：横竖两根 bar 叠成十字
.fab__plus {
  position: relative;
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    background: #fff;
    border-radius: 2px;
    transform: translate(-50%, -50%);
  }
  &::before {
    width: 16px;
    height: 2px;
  } // 横
  &::after {
    width: 2px;
    height: 16px;
  } // 竖
}
// 打开时整体旋转 45° → 十字变成「×」
.fab--open .fab__plus {
  transform: rotate(45deg);
}

// 展开的两项：拍照 / 相册
.add-menu__pop {
  position: absolute;
  top: 48px;
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  min-width: 132px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-hero);
  animation: pop-in 0.14s ease-out;
}
.add-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-dark);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
  &:active {
    background: var(--bg-fill);
  }
  :deep(svg) {
    color: var(--primary);
  }
}
// 全屏透明遮罩：点空白关闭菜单
.add-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 分类胶囊：横向滚动
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  &::-webkit-scrollbar {
    display: none;
  }
}
.chip {
  flex-shrink: 0;
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-card);
  color: var(--text-gray);
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: all 0.15s;
}
.chip--active {
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}

// 2 列网格
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr; // 两等分列
  gap: 12px;
}
.item {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden; // 缩略图圆角裁切
  box-shadow: var(--shadow-card);
}
.item__thumb {
  position: relative; // 删除按钮绝对定位参照
  height: 120px;
  background: var(--bg-fill);
  color: var(--text-gray);
  display: flex;
  align-items: center;
  justify-content: center;
}
// 缩略图右上角的删除按钮
.item__del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: color 0.12s;
  &:active {
    transform: scale(0.9);
  }
  &:hover {
    color: #e5484d; // 悬停变红，暗示危险操作
  }
}
.item__info {
  position: relative;
  padding: 10px 12px;
}
.item__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-dark);
}
.item__color {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-gray);
}

// 当前分类无单品的占位
.grid-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-light);
}

// ===== 首次空态 =====
.empty {
  flex: 1; // 占满 header 之外的空间并居中
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 24px;
}
.empty__actions {
  display: flex;
  align-items: flex-start; // 两圆大小不同，顶端对齐
  gap: 40px;
  margin-bottom: 30px;
}
.empty__action {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.circle {
  position: relative;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active {
    transform: scale(0.95);
  }
}
// 主：拍照，紫实心 + 脉冲（唯一脉动）
.circle--primary {
  width: 112px;
  height: 112px;
  border: 1px solid var(--button-primary-border);
  background: var(--gradient-button-primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
// 次：相册导入，白底 + 淡紫描边，静态、略小
.circle--ghost {
  width: 96px;
  height: 96px;
  margin-top: 8px; // 略小，稍下沉与主圆视觉对齐
  background: var(--gradient-button-secondary);
  color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--button-secondary-border);
}
.circle__pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--primary);
  animation: vc-pulse 2.2s ease-out infinite;
}
.empty__label {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-dark);
}
.empty__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-gray);
}
.empty__title {
  font-size: 21px;
  font-weight: 800;
  color: var(--text-dark);
}
.empty__desc {
  margin-top: 10px;
  max-width: 300px;
  font-size: 14px;
  line-height: 1.6;
  color: #8e8e93;
}
// 脉冲光环：从原尺寸扩散到 1.5 倍并淡出
@keyframes vc-pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  70%,
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>

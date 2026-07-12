<template>
  <div class="wardrobe">
    <PageHeader title="电子衣柜">
      <template #action v-if="isEmpty ? false : true">
        <button class="cam-btn" aria-label="拍照添加" @click="onPick('camera')">
          <AppIcon name="camera" :size="20" />
        </button>
      </template>
    </PageHeader>

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
      <!-- 分类：横向滚动胶囊 -->
      <div class="chips">
        <button
          v-for="cat in categories"
          :key="cat"
          class="chip"
          :class="{ 'chip--active': cat === activeCat }"
          @click="activeCat = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- 2 列网格 -->
      <div class="grid">
        <div v-for="item in filteredItems" :key="item.id" class="item">
          <div class="item__thumb">
            <GarmentThumb :src="item.display_image_url" :icon-size="40" />
          </div>
          <div class="item__info">
            <div class="item__name">{{ item.category }}</div>
            <div v-if="item.primary_color" class="item__color">{{ item.primary_color }}</div>
          </div>
        </div>
      </div>
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
import { ref, computed, onMounted } from 'vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import type { IconName } from '@/components/icons/icons';
import { useAuthStore } from '@/stores/auth';
import { useWardrobeStore } from '@/stores/wardrobe';
import { storeToRefs } from 'pinia';
import GarmentThumb from '@/components/GarmentThumb.vue';

interface WardrobeItem {
  id: number;
  name: string;
  icon: IconName;
  season: string;
  color: string;
  colorHex: string;
  category: string;
}

const categories = ['全部', '上衣', '裤子', '鞋履', '外套'];
const activeCat = ref('全部');

// // 演示两态：true=空态，false=网格；真实项目 = wardrobeStore.isEmpty
// const isEmpty = ref(true);

// // 假数据（真实数据后续从 wardrobe store 来）
// const items: WardrobeItem[] = [
//   {
//     id: 1,
//     name: '白衬衫',
//     icon: 'dress',
//     season: '四季',
//     color: '白色',
//     colorHex: '#f0f0f2',
//     category: '上衣',
//   },
//   {
//     id: 2,
//     name: '卡其西裤',
//     icon: 'dress',
//     season: '春秋',
//     color: '卡其',
//     colorHex: '#c9b58c',
//     category: '裤子',
//   },
//   {
//     id: 3,
//     name: '乐福鞋',
//     icon: 'dress',
//     season: '四季',
//     color: '棕色',
//     colorHex: '#8b5e3c',
//     category: '鞋履',
//   },
//   {
//     id: 4,
//     name: '风衣',
//     icon: 'dress',
//     season: '春秋',
//     color: '米色',
//     colorHex: '#d8cdb8',
//     category: '外套',
//   },
//   {
//     id: 5,
//     name: '针织衫',
//     icon: 'dress',
//     season: '秋冬',
//     color: '藏青',
//     colorHex: '#2d3a5e',
//     category: '上衣',
//   },
//   {
//     id: 6,
//     name: '牛仔裤',
//     icon: 'dress',
//     season: '四季',
//     color: '蓝色',
//     colorHex: '#5a6b8c',
//     category: '裤子',
//   },
// ];

// 两个隐藏 <input type="file"> 的引用
const cameraInput = ref<HTMLInputElement | null>(null);
const albumInput = ref<HTMLInputElement | null>(null);

const wardrobe = useWardrobeStore();
const { items, isEmpty, loading } = storeToRefs(wardrobe); // state/getter → storeToRefs
const { getClothes, addCloth } = wardrobe; // action → 直接解构

onMounted(() => {
  if (auth.loggedIn) {
    void getClothes();
  }
});

const filteredItems = computed(() =>
  activeCat.value === '全部'
    ? items.value
    : items.value.filter((i) => i.category === activeCat.value),
);

const auth = useAuthStore();

// 点拍照/相册：先过登录闸门，再打开对应的系统文件选择
function onPick(source: 'camera' | 'album') {
  if (!auth.loggedIn) {
    auth.openAuth('register'); // 未登录 → 弹注册，不打开相机/相册
    return;
  }
  (source === 'camera' ? cameraInput : albumInput).value?.click();
}

// 选好文件：交给 store 上传（store 内部轮询进度，全局 UploadToast 自动显示）
function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 清空，允许下次再选同一张
  if (!file) return;
  void wardrobe.importFromFile(file);
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

// 相机按钮（右侧动作）
.cam-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--primary);
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

// 分类胶囊：横向滚动
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
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
  position: relative; // 季节标签绝对定位参照
  height: 120px;
  background: var(--bg-fill);
  color: var(--text-gray);
  display: flex;
  align-items: center;
  justify-content: center;
}
.item__season {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-gray);
}
.item__info {
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
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

// ===== 首次空态 =====
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
  background: var(--primary);
  color: #fff;
  box-shadow: var(--shadow-cta);
}
// 次：相册导入，白底 + 淡紫描边，静态、略小
.circle--ghost {
  width: 96px;
  height: 96px;
  margin-top: 8px; // 略小，稍下沉与主圆视觉对齐
  background: var(--bg-card);
  color: var(--primary);
  box-shadow: inset 0 0 0 1.5px var(--primary-soft);
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

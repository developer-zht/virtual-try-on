<template>
  <div class="profile" @click.capture="guardClick" @focusin="guardFocus">
    <PageHeader title="我的" />

    <!-- 深色渐变名片 -->
    <div class="namecard">
      <div class="namecard__avatar"><AppIcon name="user" :size="30" /></div>
      <div class="namecard__info">
        <div class="namecard__name">{{ user.name }}</div>
        <div class="namecard__sub">{{ user.sub }}</div>
      </div>
    </div>

    <!-- 身体数据卡（可编辑）-->
    <div class="card data">
      <div class="data__row">
        <span class="data__label">身高</span>
        <span class="data__field">
          <input
            v-model.number="body.height"
            class="data__input"
            type="number"
            inputmode="numeric"
          />
          <span class="data__unit">cm</span>
        </span>
      </div>
      <div class="data__row data__row--divider">
        <span class="data__label">体重</span>
        <span class="data__field">
          <input
            v-model.number="body.weight"
            class="data__input"
            type="number"
            inputmode="numeric"
          />
          <span class="data__unit">kg</span>
        </span>
      </div>
      <div class="data__row data__row--divider">
        <span class="data__label">肤色</span>
        <input
          v-model="body.skin"
          class="data__input data__input--text"
          type="text"
          placeholder="如 自然色"
        />
      </div>
    </div>

    <!-- 体型（下拉菜单单选）-->
    <div class="card select">
      <button class="select-row" @click="bodyTypeOpen = !bodyTypeOpen">
        <span class="select-row__label">体型</span>
        <span class="select-row__value">
          {{ bodyType }}
          <AppIcon
            name="chevron-down"
            :size="16"
            class="chev"
            :class="{ 'chev--open': bodyTypeOpen }"
          />
        </span>
      </button>
      <!-- 点空白处关闭菜单 -->
      <div v-if="bodyTypeOpen" class="menu-backdrop" @click="bodyTypeOpen = false"></div>
      <!-- 下拉菜单：竖直列表 -->
      <ul v-show="bodyTypeOpen" class="menu">
        <li v-for="t in bodyTypeOptions" :key="t">
          <button
            class="menu__item"
            :class="{ 'menu__item--active': bodyType === t }"
            @click="selectBodyType(t)"
          >
            {{ t }}
            <AppIcon v-if="bodyType === t" name="check" :size="16" />
          </button>
        </li>
      </ul>
    </div>

    <!-- 高级选项（折叠，默认收起）-->
    <div class="card adv">
      <button class="adv__head" @click="advOpen = !advOpen">
        <div class="adv__titles">
          <div class="adv__title">高级选项</div>
          <div class="adv__sub">风格与颜色偏好（可选，让推荐更准）</div>
        </div>
        <div class="adv__toggle">
          {{ advOpen ? '收起' : '展开' }}
          <AppIcon name="chevron-down" :size="16" class="chev" :class="{ 'chev--open': advOpen }" />
        </div>
      </button>

      <div v-show="advOpen" class="adv__body">
        <div class="adv__divider"></div>

        <div class="adv__label">风格偏好</div>
        <div class="chip-row">
          <button
            v-for="s in styleOptions"
            :key="s"
            class="pref-chip"
            :class="{ 'pref-chip--active': selectedStyles.includes(s) }"
            @click="toggleStyle(s)"
          >
            {{ s }}
          </button>
        </div>

        <div class="adv__label">颜色偏好</div>
        <div class="adv__colors">
          <button
            v-for="c in colorOptions"
            :key="c"
            class="color-dot"
            :class="{ 'color-dot--active': selectedColor === c }"
            :style="{ background: c }"
            :aria-label="`颜色 ${c}`"
            @click="selectedColor = c"
          ></button>
        </div>

        <div class="adv__label">视觉生成模型</div>
        <div class="chip-row">
          <button
            v-for="m in genModelOptions"
            :key="m"
            class="pref-chip"
            :class="{ 'pref-chip--active': genModel === m }"
            @click="genModel = m"
          >
            {{ m }}
          </button>
        </div>

        <div class="adv__label">视觉理解模型</div>
        <div class="chip-row">
          <button
            v-for="m in vlModelOptions"
            :key="m"
            class="pref-chip"
            :class="{ 'pref-chip--active': vlModel === m }"
            @click="vlModel = m"
          >
            {{ m }}
          </button>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <button class="save-btn" @click="onSave">
      <AppIcon name="check" :size="20" />
      保存档案
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import AppIcon from '@/components/icons/AppIcon.vue';
import { useAuthStore } from '@/stores/auth';
import PageHeader from '@/components/PageHeader.vue';
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';

const auth = useAuthStore();

const user = { name: '张三', sub: '身高 178 · 体重 70kg' };

// 身体数据（可编辑）
const body = reactive({ height: 178, weight: 70, skin: '自然色' });

// 登录闸门：未登录时，点击/聚焦本页任何交互控件都拦下并弹注册
function guardClick(e: MouseEvent) {
  if (!auth.loggedIn) {
    e.stopPropagation(); // 捕获阶段拦住 → 事件到不了具体控件，其 @click 不触发
    auth.openAuth('register');
  }
}
function guardFocus(e: FocusEvent) {
  if (!auth.loggedIn) {
    (e.target as HTMLElement).blur(); // 输入框：立刻失焦 + 弹注册
    auth.openAuth('register');
  }
}

// 体型：下拉单选
const bodyTypeOptions = ['梨形', '苹果形', '沙漏形', '矩形', '倒三角'];
const bodyType = ref('沙漏形');
const bodyTypeOpen = ref(false);
function selectBodyType(t: string) {
  bodyType.value = t;
  bodyTypeOpen.value = false; // 选完收起
}

// 折叠状态
const advOpen = ref(false);

// 风格偏好：多选
const styleOptions = ['简约', '通勤', '休闲', '街头', '复古'];
const selectedStyles = ref<string[]>(['简约', '通勤']);
// function toggleStyle(s: string) {
//   const i = selectedStyles.value.indexOf(s);
//   if (i === -1) selectedStyles.value.push(s);
//   else selectedStyles.value.splice(i, 1);
// }

// 颜色偏好：单选
const colorOptions = ['#1d1d1f', '#6c5ce7', '#e17055', '#00b894', '#0984e3', '#fdcb6e'];
const selectedColor = ref('#6c5ce7');

// 视觉生成模型：单选
const genModelOptions = ['通义万相', '智谱CogView', '自定义模型'];
const genModel = ref('通义万相');

// 视觉理解模型：单选
const vlModelOptions = ['Qwen-VL', 'GPT-4o', '自定义模型'];
const vlModel = ref('Qwen-VL');

const profileStore = useProfileStore();
const { profile, options, saving, error } = storeToRefs(profileStore);
const {
  fetchProfile,
  // fetchOptions,
  saveProfile,
} = profileStore;

onMounted(() => {
  // void fetchOptions(); // 选项无需登录，总是拉
  if (auth.loggedIn) void fetchProfile(); // 档案需登录，未登录先不拉（避免 401）
});

// 登录闸门：未登录时任何编辑动作 → 开登录弹层，返回 false 让调用方停手
function guard(): boolean {
  if (!auth.loggedIn) {
    auth.openAuth();
    return false;
  }
  return true;
}

// 风格多选：切换 + 上限 3
function toggleStyle(value: string) {
  if (!guard()) return;
  const arr = profile.value.styles;
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
  else if (arr.length < 3) arr.push(value);
}

async function onSave() {
  if (!guard()) return;
  const ok = await saveProfile();
  // ok=true：保存成功（profile 已被后端返回值刷新）；失败：error 已有文案，模板自动显示
  void ok;
}
</script>

<style scoped lang="scss">
@use '../css/mixins' as *;

.profile {
  gap: 16px;
}

.card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
}

// 身体数据可编辑字段
.data__field {
  display: flex;
  align-items: center;
  gap: 4px;
}
.data__input {
  width: 64px;
  border: none;
  background: none;
  outline: none;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
  &::placeholder {
    color: var(--text-light);
    font-weight: 400;
  }
}
.data__input--text {
  width: auto;
  min-width: 90px;
}
.data__unit {
  font-size: 13px;
  color: var(--text-gray);
}

// ===== 深色名片 =====
.namecard {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, #1d1d1f, #3a3a3f);
  color: #fff;
  box-shadow: var(--shadow-hero);
}
.namecard__avatar {
  flex-shrink: 0;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.namecard__name {
  font-size: 20px;
  font-weight: 800;
}
.namecard__sub {
  margin-top: 3px;
  font-size: 13px;
  opacity: 0.7;
}

// ===== 身体数据 =====
.data__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
}
.data__row--divider {
  border-top: 1px solid var(--hairline);
}
.data__label {
  font-size: 14px;
  color: var(--text-gray);
}
.data__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
}

// ===== 体型下拉行 =====
.select-row {
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.select-row__label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark);
}
.select-row__value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark);
}

// 箭头翻转（体型行 + 高级选项共用）
.chev {
  transition: transform 0.2s;
}
.chev--open {
  transform: rotate(180deg);
}

// ===== 体型下拉菜单 =====
.select {
  position: relative; // 给绝对定位的 .menu 当参照
}
.menu-backdrop {
  position: fixed; // 铺满视口，点它关菜单
  inset: 0;
  z-index: 15;
}
.menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%; // 紧贴卡片下方
  margin-top: 6px;
  z-index: 20; // 盖在下方内容之上
  padding: 6px;
  list-style: none;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
}
.menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 12px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--text-dark);
  cursor: pointer;
  &:active {
    background: var(--bg-fill);
  }
}
.menu__item--active {
  color: var(--primary);
  font-weight: 700;
}

// ===== 高级选项 =====
.adv__head {
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}
.adv__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark);
}
.adv__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-gray);
}
.adv__toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: var(--primary);
}
.adv__divider {
  height: 1px;
  background: var(--hairline);
  margin: 14px 0;
}
.adv__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gray);
  margin-bottom: 8px;
  &:not(:first-child) {
    margin-top: 16px;
  }
}

// ===== 胶囊 / 颜色圆点（体型、风格、模型共用）=====
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px; // 体型行展开时和上方留距；高级选项里紧跟 label
}
.pref-chip {
  padding: 7px 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-fill);
  color: var(--text-gray);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.pref-chip--active {
  background: var(--primary);
  color: #fff;
}
.adv__colors {
  display: flex;
  gap: 12px;
}
.color-dot {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.color-dot--active {
  box-shadow:
    0 0 0 2px var(--bg-card),
    0 0 0 4px var(--primary);
}

// ===== 保存按钮（复用 mixin）=====
.save-btn {
  @include btn-primary;
  margin-top: 4px;
}
</style>

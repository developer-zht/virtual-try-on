<template>
  <!-- 最顶层：模糊背板 + iOS 底部 Sheet -->
  <div class="auth">
    <div class="auth__backdrop" @click="closeAuth"></div>

    <div class="auth__sheet">
      <div class="auth__handle"></div>

      <!-- 品牌区 -->
      <div class="auth__brand">
        <div class="auth__logo"><AppIcon name="sparkle" :size="26" /></div>
        <div class="auth__title">{{ isRegister ? '创建你的账号' : '欢迎回来' }}</div>
        <div class="auth__subtitle">AI 帮你搭配每日穿搭</div>
      </div>

      <!-- 注册 / 登录 分段切换（切模式只调 openAuth，不自存 mode）-->
      <div class="seg">
        <button
          class="seg__item"
          :class="{ 'seg__item--active': isRegister }"
          @click="openAuth('register')"
        >
          注册
        </button>
        <button
          class="seg__item"
          :class="{ 'seg__item--active': !isRegister }"
          @click="openAuth('login')"
        >
          登录
        </button>
      </div>

      <!-- 表单：邮箱 + 密码（匹配 store 的 login({ email, password }) -->
      <!-- 用 <form> 包起来：消除 Chrome「密码框不在 form 内」警告 + 支持回车提交 + 密码管理器识别  -->
      <form @submit.prevent="onSubmit">
        <label class="field">
          <AppIcon name="user" :size="18" class="field__icon" />
          <input
            v-model="email"
            class="field__input"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="邮箱"
          />
        </label>
        <label class="field">
          <AppIcon name="lock" :size="18" class="field__icon" />
          <input
            v-model="password"
            class="field__input"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="密码"
          />
        </label>

        <!-- 错误区（store.error）-->
        <div v-if="error" class="auth__error">{{ error }}</div>

        <!-- 主按钮：type=submit → 回车/点击都提交；loading 时禁用 -->
        <button class="auth__submit" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : isRegister ? '注册并登录' : '登录' }}
        </button>
      </form>

      <button class="auth__later" @click="closeAuth">稍后再说</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import AppIcon from '@/components/icons/AppIcon.vue';

const auth = useAuthStore();
// storeToRefs：把 state/getter 取成 ref 且保持响应式（直接解构会丢响应性）
const { loading, error, authMode } = storeToRefs(auth);
// action 可以直接解构（Pinia 会自动绑定 this）
const { openAuth, closeAuth, login } = auth;

const isRegister = computed(() => authMode.value === 'register');

// 表单字段是本组件的局部状态（store 不管表单内容）
const email = ref('');
const password = ref('');

async function onSubmit() {
  // 成功：store 自动 closeAuth；失败：store 已填好 error，这里无需处理
  await login({ email: email.value, password: password.value });
}

onMounted(async () => {
  console.log('已登录,记得事后删除掉该代码');
  await login({ email: 'laogeen@gmail.com', password: 'laogen12345' });
});
</script>

<style scoped lang="scss">
.auth {
  position: fixed;
  inset: 0;
  z-index: 1000; // 高于 Tab 与所有浮层
  display: flex;
  align-items: flex-end; // Sheet 贴底
}
.auth__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 26, 0.34);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  animation: vc-fade 0.25s ease;
}
.auth__sheet {
  position: relative;
  width: 100%;
  background: var(--bg-main);
  border-radius: 30px 30px 0 0;
  padding: 10px 20px calc(20px + var(--safe-bottom));
  animation: vc-up 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}
.auth__handle {
  width: 40px;
  height: 5px;
  margin: 0 auto 16px;
  border-radius: var(--radius-pill);
  background: var(--hairline);
}

// 品牌区
.auth__brand {
  text-align: center;
  margin-bottom: 20px;
}
.auth__logo {
  width: 58px;
  height: 58px;
  margin: 0 auto 12px;
  border-radius: 18px; // squircle
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-cta);
}
.auth__title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-dark);
}
.auth__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-gray);
}

// 分段切换
.seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--bg-fill);
  margin-bottom: 16px;
}
.seg__item {
  flex: 1;
  padding: 9px 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-gray);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.seg__item--active {
  background: var(--bg-card);
  color: var(--text-dark);
  box-shadow: var(--shadow-card);
}

// 输入框
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  height: 50px;
  margin-bottom: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-fill);
  color: var(--text-light);
}
.field__input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 15px;
  color: var(--text-dark);
  &::placeholder {
    color: var(--text-light);
  }
}

.auth__error {
  margin: 2px 2px 12px;
  font-size: 13px;
  color: var(--negative, #c10015);
}

.auth__submit {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: var(--shadow-cta);
  cursor: pointer;
  transition: opacity 0.2s;
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}
.auth__later {
  display: block;
  width: 100%;
  margin-top: 14px;
  border: none;
  background: none;
  color: var(--text-gray);
  font-size: 14px;
  cursor: pointer;
}

@keyframes vc-up {
  from {
    transform: translateY(14px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes vc-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
